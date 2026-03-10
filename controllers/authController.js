const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
    /**
     * POST /api/auth/register
     */
    async register(req, res) {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({ error: 'Name, email, and password are required.' });
            }

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ error: 'A user with this email already exists.' });
            }

            const user = await User.create({ name, email, password });

            const token = this.generateToken(user._id);

            res.status(201).json({
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt
                },
            });
        } catch (err) {
            console.error('Register error:', err);
            res.status(500).json({ error: 'Server error during registration.' });
        }
    }

    /**
     * POST /api/auth/login
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required.' });
            }

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            const token = this.generateToken(user._id);

            res.json({
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt
                },
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ error: 'Server error during login.' });
        }
    }

    /**
     * GET /api/auth/profile
     */
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user).select('-password');
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            res.json({
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
            });
        } catch (err) {
            console.error('Profile error:', err);
            res.status(500).json({ error: 'Server error fetching profile.' });
        }
    }

    /**
     * POST /api/auth/change-password
     */
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current and new passwords are required.' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters.' });
            }

            const user = await User.findById(req.user);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({ error: 'Current password is incorrect.' });
            }

            user.password = newPassword;
            await user.save();

            res.json({ message: 'Password changed successfully.' });
        } catch (err) {
            console.error('Change password error:', err);
            res.status(500).json({ error: 'Server error changing password.' });
        }
    }

    generateToken(userId) {
        return jwt.sign({ userId }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });
    }
}

module.exports = new AuthController();
