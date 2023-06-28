const validationSchemas = {
  addImages: {
    type: 'object',
    properties: {
      societyId: { format: 'uuid' },
      images: {
        type: 'array',
        items: { format: 'uri' },
      },
    },
    required: ['societyId', 'images'],
    additionalProperties: false,
  },
};

export default validationSchemas;
