const validationSchemas = {
  addImages: {
    type: 'object',
    properties: {
      amenityId: { format: 'uuid' },
      images: {
        type: 'array',
        items: { format: 'uri' },
      },
    },
    required: ['amenityId', 'images'],
    additionalProperties: false,
  },
};

export default validationSchemas;
