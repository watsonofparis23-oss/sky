// Global error handler middleware
function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    } else if (err.code === 'ENOENT') {
        statusCode = 404;
        message = 'File not found';
    } else if (err.code === 'SQLITE_CONSTRAINT') {
        statusCode = 400;
        message = 'Database constraint violation';
    } else if (err.message) {
        message = err.message;
    }

    // Send error response
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

module.exports = errorHandler;