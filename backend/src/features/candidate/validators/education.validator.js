const Joi = require("joi");

exports.educationSchema = Joi.object({
  candidateId: Joi.string().required(),
  schoolName: Joi.string().required(),
  major: Joi.string().required(),
  degreeType: Joi.string().required(),
  gpa: Joi.number().min(0).max(4).optional(),
  startDate: Joi.object({
    month: Joi.number().min(1).max(12).required(),
    year: Joi.number().min(1950).max(2050).required()
  }),
  endDate: Joi.object({
    month: Joi.number().min(1).max(12).optional(),
    year: Joi.number().min(1950).max(2050).optional()
  })
});
