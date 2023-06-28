const validationSchemas = {
  updateProfile: {
    properties: {
      email: { format: 'email' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      middleName: { type: 'string' },
      profileImage: { format: 'uri' },
    },
    // required: [],
    additionalProperties: false,
  },
  fetchResidents: {
    properties: {
      societyId: { format: 'uuid' },
    },
    required: ['societyId'],
    additionalProperties: false,
  },
  updateResident: {
    properties: {
      userId: { format: 'uuid' },
      firstName: { type: ['string', 'null'] },
      lastName: { type: ['string', 'null'] },
      email: { format: 'email', type: ['string', 'null'] },
      isOwner: { type: ['boolean', 'null'] },
    },
    required: ['userId'],
    additionalProperties: false,
  },
};

export default validationSchemas;
