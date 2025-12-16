class ResponseUtils {
  /**
   * Success response
   */
  success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Error response
   */
  error(res, message = 'Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Paginated response
   */
  paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination
    });
  }

  /**
   * Created response
   */
  created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * No content response
   */
  noContent(res) {
    return res.status(204).send();
  }

  /**
   * Bad request response
   */
  badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  /**
   * Unauthorized response
   */
  unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden response
   */
  forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  /**
   * Not found response
   */
  notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  /**
   * Conflict response
   */
  conflict(res, message = 'Resource already exists') {
    return this.error(res, message, 409);
  }

  /**
   * Validation error response
   */
  validationError(res, errors) {
    return this.error(res, 'Validation failed', 422, errors);
  }

  /**
   * Internal server error response
   */
  internalError(res, message = 'Internal server error') {
    return this.error(res, message, 500);
  }

  /**
   * Service unavailable response
   */
  serviceUnavailable(res, message = 'Service temporarily unavailable') {
    return this.error(res, message, 503);
  }

  /**
   * Rate limit exceeded response
   */
  rateLimitExceeded(res, message = 'Too many requests') {
    return this.error(res, message, 429);
  }
}

module.exports = new ResponseUtils();