import { USER_ROLES } from '../../../constants.js';

const validationSchemas = {
  addStaff: {
    properties: {
      societyId: { format: 'uuid' },
      email: {
        format: 'email',
      },
      firstName: { type: 'string' },
      middleName: { type: 'string' },
      lastName: { type: 'string' },
      mobileNumber: { type: 'string', minLength: 10, maxLength: 10 },
      role: { enum: [...Object.keys(USER_ROLES)] },
    },
    required: ['societyId', 'email', 'role', 'firstName', 'mobileNumber'],
    additionalProperties: false,
  },
};

export default validationSchemas;
