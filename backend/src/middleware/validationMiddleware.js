const { z } = require('zod');

const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync(req.body);
    next();
  } catch (error) {
    const errorsList = error.errors || error.issues;
    if (errorsList) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorsList.map((e) => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    next(error);
  }
};

module.exports = validate;
