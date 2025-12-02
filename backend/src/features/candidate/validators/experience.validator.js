const Joi = require("joi");

exports.experienceSchema = Joi.object({
  candidateId: Joi.string().required(),
  jobTitle: Joi.string().required(),
  companyName: Joi.string().required(),
  location: Joi.string().required(),
  experienceType: Joi.string().valid("Full-time", "Part-time", "Internship", "Contract").required(),
  startDate: Joi.object({
    month: Joi.number().min(1).max(12).required(),
    year: Joi.number().min(1950).max(2050).required()
  }),
  endDate: Joi.object({
    month: Joi.number().min(1).max(12),
    year: Joi.number().min(1950).max(2050)
  }),
  description: Joi.string().allow("", null)
});
