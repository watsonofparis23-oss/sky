const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

// Helper function to generate booking reference
function generateBookingReference() {
  return 'SKY' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Helper function to generate PNR
function generatePNR() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /bookings/create
exports.createBooking = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { 
      flightId, 
      bookingType = 'one_way',
      class: flightClass, 
      passengers, 
      adults = 1, 
      children = 0, 
      infants = 0,
      specialRequests 
    } = req.body;

    // Get flight details
    const flight = await db.get('SELECT * FROM flights WHERE id = ?', [flightId]);

    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    // Calculate total passengers
    const totalPassengers = parseInt(adults) + parseInt(children) + parseInt(infants);

    // Check seat availability
    let availableSeats, seatColumn;
    switch (flightClass) {
      case 'economy':
        availableSeats = flight.economy_available;
        seatColumn = 'economy_available';
        break;
      case 'premium_economy':
        availableSeats = flight.premium_economy_available;
        seatColumn = 'premium_economy_available';
        break;
      case 'business':
        availableSeats = flight.business_available;
        seatColumn = 'business_available';
        break;
      case 'first_class':
        availableSeats = flight.first_class_available;
        seatColumn = 'first_class_available';
        break;
      default:
        return res.status(400).json({ error: 'Invalid class selected' });
    }

    if (availableSeats < totalPassengers) {
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    // Calculate pricing
    const baseFare = flight.base_price * totalPassengers;
    const taxes = baseFare * 0.08; // 8% taxes
    const fees = 25 * totalPassengers; // $25 per passenger
    const totalPrice = baseFare + taxes + fees;

    // Generate booking reference and PNR
    const bookingReference = generateBookingReference();
    const pnr = generatePNR();

    // Create booking
    const booking = await db.run(
      `INSERT INTO bookings (
        booking_reference, user_id, flight_id, pnr, booking_type, class,
        passengers, total_passengers, adults, children, infants,
        base_fare, taxes, fees, total_price, status, special_requests
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        bookingReference, userId, flightId, pnr, bookingType, flightClass,
        JSON.stringify(passengers), totalPassengers, adults, children, infants,
        baseFare, taxes, fees, totalPrice, specialRequests
      ]
    );

    // Update seat availability
    await db.run(
      `UPDATE flights SET ${seatColumn} = ${seatColumn} - ? WHERE id = ?`,
      [totalPassengers, flightId]
    );

    // Create notification
    await db.run(
      `INSERT INTO notifications (user_id, type, title, message, priority, related_id, related_type)
       VALUES (?, 'booking', 'Booking Created', 'Your booking ${bookingReference} has been created successfully', 'normal', ?, 'booking')`,
      [userId, booking.id]
    );

    res.json({ 
      success: true, 
      bookingId: booking.id,
      bookingReference,
      pnr,
      message: 'Booking created successfully' 
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

// GET /bookings/:id
exports.getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const booking = await db.get(
      `SELECT b.*, f.*, v.company_name, v.airline_code, v.logo
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       JOIN vendors v ON f.vendor_id = v.id
       WHERE b.id = ? AND b.user_id = ?`,
      [id, userId]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ booking });
    }

    res.render('bookings/details', {
      title: `Booking ${booking.booking_reference} - SkyVoyage`,
      page: 'booking-details',
      booking
    });
  } catch (error) {
    console.error('Booking details error:', error);
    res.status(500).json({ error: 'Failed to load booking details' });
  }
};

// POST /bookings/:id/cancel
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    // Get booking
    const booking = await db.get(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    // Update booking status
    await db.run(
      'UPDATE bookings SET status = \'cancelled\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    // Restore seat availability
    const flight = await db.get('SELECT * FROM flights WHERE id = ?', [booking.flight_id]);
    
    let seatColumn;
    switch (booking.class) {
      case 'economy':
        seatColumn = 'economy_available';
        break;
      case 'premium_economy':
        seatColumn = 'premium_economy_available';
        break;
      case 'business':
        seatColumn = 'business_available';
        break;
      case 'first_class':
        seatColumn = 'first_class_available';
        break;
    }

    await db.run(
      `UPDATE flights SET ${seatColumn} = ${seatColumn} + ? WHERE id = ?`,
      [booking.total_passengers, booking.flight_id]
    );

    // Create notification
    await db.run(
      `INSERT INTO notifications (user_id, type, title, message, priority, related_id, related_type)
       VALUES (?, 'booking', 'Booking Cancelled', 'Your booking ${booking.booking_reference} has been cancelled', 'high', ?, 'booking')`,
      [userId, id]
    );

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

// POST /bookings/:id/seat
exports.updateSeat = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const { seatNumbers } = req.body;

    // Get booking
    const booking = await db.get(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update seat numbers
    await db.run(
      'UPDATE bookings SET seat_numbers = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(seatNumbers), id]
    );

    res.json({ success: true, message: 'Seat updated successfully' });
  } catch (error) {
    console.error('Update seat error:', error);
    res.status(500).json({ error: 'Failed to update seat' });
  }
};

// POST /bookings/:id/baggage
exports.addBaggage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const { baggage } = req.body;

    // Get booking
    const booking = await db.get(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Calculate additional baggage fees (example: $50 per bag)
    const baggageFee = 50 * (baggage.additionalBags || 0);
    const newTotal = booking.total_price + baggageFee;

    // Update baggage and total price
    await db.run(
      'UPDATE bookings SET baggage = ?, total_price = ?, fees = fees + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(baggage), newTotal, baggageFee, id]
    );

    res.json({ success: true, message: 'Baggage added successfully', additionalFee: baggageFee });
  } catch (error) {
    console.error('Add baggage error:', error);
    res.status(500).json({ error: 'Failed to add baggage' });
  }
};

// GET /bookings/:id/boarding-pass
exports.downloadBoardingPass = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const booking = await db.get(
      `SELECT b.*, f.*, v.company_name, v.airline_code, u.first_name, u.last_name
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       JOIN vendors v ON f.vendor_id = v.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ? AND b.user_id = ?`,
      [id, userId]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking not confirmed' });
    }

    // In a real application, you would generate a PDF here
    // For now, we'll render an HTML boarding pass
    res.render('bookings/boarding-pass', {
      title: 'Boarding Pass - SkyVoyage',
      page: 'boarding-pass',
      booking,
      layout: false // No layout for printing
    });
  } catch (error) {
    console.error('Download boarding pass error:', error);
    res.status(500).json({ error: 'Failed to download boarding pass' });
  }
};
