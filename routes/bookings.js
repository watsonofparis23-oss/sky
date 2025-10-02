const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { requireAuth, logActivity } = require('../middleware/auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');

// View Booking Details
router.get('/:id', requireAuth, (req, res) => {
  const bookingId = req.params.id;
  
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT b.*, f.flight_number, f.departure_time, f.arrival_time, f.gate, f.terminal,
           r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name, v.iata_code, v.icao_code, v.website,
           ac.aircraft_type, ac.capacity
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    JOIN aircraft ac ON f.aircraft_id = ac.id
    WHERE b.id = ? AND b.user_id = ?
  `;
  
  db.get(query, [bookingId, req.session.user.id], (err, booking) => {
    if (err) {
      console.error('Error fetching booking:', err);
      req.flash('error', 'Error loading booking details');
      return res.redirect('/user/dashboard');
    }
    
    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/user/dashboard');
    }
    
    // Process booking data
    const departureTime = new Date(booking.departure_time);
    const arrivalTime = new Date(booking.arrival_time);
    const duration = Math.round((arrivalTime - departureTime) / (1000 * 60));
    
    const processedBooking = {
      ...booking,
      duration: duration,
      durationFormatted: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      departureTimeFormatted: departureTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      arrivalTimeFormatted: arrivalTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      departureDateFormatted: departureTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      arrivalDateFormatted: arrivalTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      passengerDetails: JSON.parse(booking.passenger_details || '{}'),
      specialRequests: JSON.parse(booking.special_requests || '{}')
    };
    
    db.close();
    
    res.render('bookings/details', {
      title: 'Booking Details',
      booking: processedBooking
    });
  });
});

// Cancel Booking
router.post('/:id/cancel', requireAuth, (req, res) => {
  const bookingId = req.params.id;
  const { reason } = req.body;
  
  const db = new sqlite3.Database(dbPath);
  
  // Get booking details
  db.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, req.session.user.id], (err, booking) => {
    if (err) {
      console.error('Error fetching booking:', err);
      req.flash('error', 'Error processing cancellation');
      return res.redirect('/user/bookings');
    }
    
    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/user/bookings');
    }
    
    // Check if cancellation is allowed (within 24 hours)
    const departureTime = new Date(booking.departure_time);
    const now = new Date();
    const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilDeparture < 24) {
      req.flash('error', 'Cancellation not allowed within 24 hours of departure');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    // Calculate refund amount (simplified - 90% refund)
    const refundAmount = booking.total_amount * 0.9;
    
    // Update booking status
    db.run(`UPDATE bookings SET status = 'cancelled', cancellation_date = CURRENT_TIMESTAMP, 
            refund_amount = ? WHERE id = ?`,
      [refundAmount, bookingId],
      function(err) {
        if (err) {
          console.error('Error cancelling booking:', err);
          req.flash('error', 'Error processing cancellation');
          return res.redirect(`/bookings/${bookingId}`);
        }
        
        // Update flight availability
        db.run('UPDATE flights SET available_seats = available_seats + ? WHERE id = ?',
          [booking.passenger_count, booking.flight_id]);
        
        // Create refund payment record
        db.run(`INSERT INTO payments (booking_id, amount, currency, payment_method, 
                status, processed_at) VALUES (?, ?, 'USD', 'refund', 'processed', CURRENT_TIMESTAMP)`,
          [bookingId, refundAmount]);
        
        // Log activity
        logActivity(req, 'booking_cancelled', {
          table_name: 'bookings',
          record_id: bookingId,
          old_values: { status: booking.status },
          new_values: { status: 'cancelled', refund_amount: refundAmount }
        });
        
        db.close();
        
        req.flash('success', `Booking cancelled successfully. Refund of $${refundAmount.toFixed(2)} will be processed within 5-7 business days.`);
        res.redirect('/user/bookings');
      }
    );
  });
});

// Change Seat
router.post('/:id/change-seat', requireAuth, (req, res) => {
  const bookingId = req.params.id;
  const { newSeat } = req.body;
  
  if (!newSeat) {
    req.flash('error', 'Please select a new seat');
    return res.redirect(`/bookings/${bookingId}`);
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Get current booking
  db.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, req.session.user.id], (err, booking) => {
    if (err) {
      console.error('Error fetching booking:', err);
      req.flash('error', 'Error processing seat change');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/user/bookings');
    }
    
    // Check if seat change is allowed (more than 2 hours before departure)
    const departureTime = new Date(booking.departure_time);
    const now = new Date();
    const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilDeparture < 2) {
      req.flash('error', 'Seat changes not allowed within 2 hours of departure');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    // Update seat numbers
    const currentSeats = JSON.parse(booking.seat_numbers || '[]');
    const updatedSeats = [...currentSeats];
    updatedSeats[0] = newSeat; // Simplified - assuming single passenger
    
    db.run('UPDATE bookings SET seat_numbers = ? WHERE id = ?',
      [JSON.stringify(updatedSeats), bookingId],
      function(err) {
        if (err) {
          console.error('Error updating seat:', err);
          req.flash('error', 'Error processing seat change');
          return res.redirect(`/bookings/${bookingId}`);
        }
        
        // Log activity
        logActivity(req, 'seat_changed', {
          table_name: 'bookings',
          record_id: bookingId,
          old_values: { seat_numbers: booking.seat_numbers },
          new_values: { seat_numbers: JSON.stringify(updatedSeats) }
        });
        
        db.close();
        
        req.flash('success', 'Seat changed successfully');
        res.redirect(`/bookings/${bookingId}`);
      }
    );
  });
});

// Add Baggage
router.post('/:id/add-baggage', requireAuth, (req, res) => {
  const bookingId = req.params.id;
  const { baggageType, weight } = req.body;
  
  if (!baggageType || !weight) {
    req.flash('error', 'Please provide baggage details');
    return res.redirect(`/bookings/${bookingId}`);
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Get booking details
  db.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, req.session.user.id], (err, booking) => {
    if (err) {
      console.error('Error fetching booking:', err);
      req.flash('error', 'Error processing baggage request');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/user/bookings');
    }
    
    // Calculate baggage fee (simplified pricing)
    let baggageFee = 0;
    if (baggageType === 'checked') {
      baggageFee = weight <= 23 ? 50 : 75; // $50 for up to 23kg, $75 for heavier
    } else if (baggageType === 'overweight') {
      baggageFee = 100;
    }
    
    // Update booking with baggage information
    const specialRequests = JSON.parse(booking.special_requests || '{}');
    specialRequests.baggage = {
      type: baggageType,
      weight: weight,
      fee: baggageFee
    };
    
    const newTotalAmount = booking.total_amount + baggageFee;
    
    db.run(`UPDATE bookings SET special_requests = ?, total_amount = ? WHERE id = ?`,
      [JSON.stringify(specialRequests), newTotalAmount, bookingId],
      function(err) {
        if (err) {
          console.error('Error updating baggage:', err);
          req.flash('error', 'Error processing baggage request');
          return res.redirect(`/bookings/${bookingId}`);
        }
        
        // Create additional payment record for baggage fee
        if (baggageFee > 0) {
          db.run(`INSERT INTO payments (booking_id, amount, currency, payment_method, 
                  status) VALUES (?, ?, 'USD', 'credit_card', 'pending')`,
            [bookingId, baggageFee]);
        }
        
        // Log activity
        logActivity(req, 'baggage_added', {
          table_name: 'bookings',
          record_id: bookingId,
          new_values: { baggage: specialRequests.baggage, total_amount: newTotalAmount }
        });
        
        db.close();
        
        req.flash('success', `Baggage added successfully. Additional fee: $${baggageFee}`);
        res.redirect(`/bookings/${bookingId}`);
      }
    );
  });
});

// Download Boarding Pass
router.get('/:id/boarding-pass', requireAuth, (req, res) => {
  const bookingId = req.params.id;
  
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT b.*, f.flight_number, f.departure_time, f.arrival_time, f.gate, f.terminal,
           r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name, u.first_name, u.last_name
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ? AND b.user_id = ?
  `;
  
  db.get(query, [bookingId, req.session.user.id], (err, booking) => {
    if (err) {
      console.error('Error fetching booking for boarding pass:', err);
      req.flash('error', 'Error generating boarding pass');
      return res.redirect('/user/bookings');
    }
    
    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/user/bookings');
    }
    
    // Check if boarding pass is available (24 hours before departure)
    const departureTime = new Date(booking.departure_time);
    const now = new Date();
    const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilDeparture > 24) {
      req.flash('error', 'Boarding pass available 24 hours before departure');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    db.close();
    
    // Generate boarding pass HTML (in production, this would be a PDF)
    res.render('bookings/boarding-pass', {
      title: 'Boarding Pass',
      booking: booking
    });
  });
});

// Check-in Online
router.post('/:id/checkin', requireAuth, (req, res) => {
  const bookingId = req.params.id;
  
  const db = new sqlite3.Database(dbPath);
  
  // Get booking details
  db.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, req.session.user.id], (err, booking) => {
    if (err) {
      console.error('Error fetching booking:', err);
      req.flash('error', 'Error processing check-in');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/user/bookings');
    }
    
    // Check if check-in is available (24 hours before departure)
    const departureTime = new Date(booking.departure_time);
    const now = new Date();
    const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilDeparture > 24) {
      req.flash('error', 'Online check-in available 24 hours before departure');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    if (hoursUntilDeparture < 2) {
      req.flash('error', 'Online check-in closed 2 hours before departure');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    // Update booking with check-in status
    db.run('UPDATE bookings SET check_in_date = CURRENT_TIMESTAMP WHERE id = ?',
      [bookingId],
      function(err) {
        if (err) {
          console.error('Error updating check-in:', err);
          req.flash('error', 'Error processing check-in');
          return res.redirect(`/bookings/${bookingId}`);
        }
        
        // Log activity
        logActivity(req, 'online_checkin', {
          table_name: 'bookings',
          record_id: bookingId,
          new_values: { check_in_date: new Date().toISOString() }
        });
        
        db.close();
        
        req.flash('success', 'Online check-in completed successfully! Your boarding pass is ready.');
        res.redirect(`/bookings/${bookingId}/boarding-pass`);
      }
    );
  });
});

// Request Refund
router.post('/:id/refund', requireAuth, (req, res) => {
  const bookingId = req.params.id;
  const { reason } = req.body;
  
  const db = new sqlite3.Database(dbPath);
  
  // Get booking details
  db.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, req.session.user.id], (err, booking) => {
    if (err) {
      console.error('Error fetching booking:', err);
      req.flash('error', 'Error processing refund request');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/user/bookings');
    }
    
    // Check if refund is allowed
    if (booking.status === 'cancelled') {
      req.flash('error', 'Booking is already cancelled');
      return res.redirect(`/bookings/${bookingId}`);
    }
    
    // Create refund request notification for admin
    db.run(`INSERT INTO notifications (admin_id, title, message, type, priority) 
            VALUES (1, 'Refund Request', ?, 'refund', 'high')`,
      [`Refund request for booking ${booking.booking_reference}. Reason: ${reason}`],
      function(err) {
        if (err) {
          console.error('Error creating refund notification:', err);
        }
        
        // Log activity
        logActivity(req, 'refund_requested', {
          table_name: 'bookings',
          record_id: bookingId,
          new_values: { refund_reason: reason }
        });
        
        db.close();
        
        req.flash('success', 'Refund request submitted successfully. We will review your request and process it within 5-7 business days.');
        res.redirect(`/bookings/${bookingId}`);
      }
    );
  });
});

module.exports = router;