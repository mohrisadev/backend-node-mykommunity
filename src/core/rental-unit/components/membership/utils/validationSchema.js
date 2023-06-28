const validationSchemas = {
  applyForMembership: {
    properties: {
      rentalUnitId: { format: 'uuid' },
    },
    required: ['rentalUnitId'],
    additionalProperties: false,
  },
  approveMembership: {
    properties: {
      userRoleId: { format: 'uuid' },
    },
    required: ['userRoleId'],
    additionalProperties: false,
  },
  addMembers: {
    properties: {
      mobileNumber: { type: 'string', minLength: 10, maxLength: 10 },
    },
    required: ['mobileNumber'],
    additionalProperties: false,
  },
};

export default validationSchemas;
