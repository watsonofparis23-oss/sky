const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const user = await database.get(`
            SELECT id, email, first_name, last_name, phone, date_of_birth, 
                   gender, nationality, passport_number, passport_expiry,
                   loyalty_points, membership_tier, preferences, created_at
            FROM users WHERE id = ?
        `, [req.user.id]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Parse preferences if they exist
        let preferences = {};
        if (user.preferences) {
            try {
                preferences = JSON.parse(user.preferences);
            } catch (e) {
                preferences = {};
            }
        }

        res.json({
            user: {
                ...user,
                preferences
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user profile
router.put('/profile', [
    body('firstName').optional().notEmpty().trim(),
    body('lastName').optional().notEmpty().trim(),
    body('phone').optional().isMobilePhone(),
    body('dateOfBirth').optional().isISO8601(),
    body('gender').optional().isIn(['male', 'female', 'other']),
    body('nationality').optional().notEmpty().trim(),
    body('passportNumber').optional().notEmpty().trim(),
    body('passportExpiry').optional().isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            firstName,
            lastName,
            phone,
            dateOfBirth,
            gender,
            nationality,
            passportNumber,
            passportExpiry
        } = req.body;

        await database.run(`
            UPDATE users SET 
                first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                phone = COALESCE(?, phone),
                date_of_birth = COALESCE(?, date_of_birth),
                gender = COALESCE(?, gender),
                nationality = COALESCE(?, nationality),
                passport_number = COALESCE(?, passport_number),
                passport_expiry = COALESCE(?, passport_expiry),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            firstName, lastName, phone, dateOfBirth, gender,
            nationality, passportNumber, passportExpiry, req.user.id
        ]);

        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get user preferences
router.get('/preferences', async (req, res) => {
    try {
        const user = await database.get(
            'SELECT preferences FROM users WHERE id = ?',
            [req.user.id]
        );

        let preferences = {};
        if (user && user.preferences) {
            try {
                preferences = JSON.parse(user.preferences);
            } catch (e) {
                preferences = {};
            }
        }

        res.json({ preferences });

    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ error: 'Failed to get preferences' });
    }
});

// Update user preferences
router.put('/preferences', async (req, res) => {
    try {
        const { preferences } = req.body;

        await database.run(`
            UPDATE users SET 
                preferences = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [JSON.stringify(preferences), req.user.id]);

        res.json({ message: 'Preferences updated successfully' });

    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// Get user notifications
router.get('/notifications', async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE user_id = ?';
        let params = [req.user.id];

        if (unreadOnly === 'true') {
            whereClause += ' AND is_read = FALSE';
        }

        const notifications = await database.query(`
            SELECT id, type, title, message, is_read, priority, action_url, created_at
            FROM notifications 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        // Get total count
        const totalResult = await database.get(`
            SELECT COUNT(*) as total FROM notifications ${whereClause}
        `, params);

        res.json({
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult.total,
                pages: Math.ceil(totalResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        await database.run(`
            UPDATE notifications SET 
                is_read = TRUE,
                read_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `, [id, req.user.id]);

        res.json({ message: 'Notification marked as read' });

    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.put('/notifications/read-all', async (req, res) => {
    try {
        await database.run(`
            UPDATE notifications SET 
                is_read = TRUE,
                read_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND is_read = FALSE
        `, [req.user.id]);

        res.json({ message: 'All notifications marked as read' });

    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// Get user loyalty points
router.get('/loyalty', async (req, res) => {
    try {
        const user = await database.get(
            'SELECT loyalty_points, membership_tier FROM users WHERE id = ?',
            [req.user.id]
        );

        const transactions = await database.query(`
            SELECT transaction_type, points, description, created_at
            FROM loyalty_transactions 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        `, [req.user.id]);

        res.json({
            loyaltyPoints: user.loyalty_points,
            membershipTier: user.membership_tier,
            recentTransactions: transactions
        });

    } catch (error) {
        console.error('Get loyalty error:', error);
        res.status(500).json({ error: 'Failed to get loyalty information' });
    }
});

// Get user wishlist
router.get('/wishlist', async (req, res) => {
    try {
        const wishlist = await database.query(`
            SELECT id, item_type, item_id, item_data, notes, created_at
            FROM wishlists 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [req.user.id]);

        // Parse item_data for each item
        const parsedWishlist = wishlist.map(item => ({
            ...item,
            item_data: item.item_data ? JSON.parse(item.item_data) : {}
        }));

        res.json({ wishlist: parsedWishlist });

    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ error: 'Failed to get wishlist' });
    }
});

// Add item to wishlist
router.post('/wishlist', [
    body('itemType').isIn(['destination', 'route', 'flight', 'deal']),
    body('itemData').isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { itemType, itemId, itemData, notes } = req.body;

        const result = await database.run(`
            INSERT INTO wishlists (user_id, item_type, item_id, item_data, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [req.user.id, itemType, itemId || null, JSON.stringify(itemData), notes || null]);

        res.status(201).json({ 
            message: 'Item added to wishlist',
            wishlistId: result.id
        });

    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ error: 'Failed to add item to wishlist' });
    }
});

// Remove item from wishlist
router.delete('/wishlist/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await database.run(
            'DELETE FROM wishlists WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({ message: 'Item removed from wishlist' });

    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ error: 'Failed to remove item from wishlist' });
    }
});

module.exports = router;