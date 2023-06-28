const validationSchemas = {
  createDiscussion: {
    properties: {
      content: {
        type: 'string',
        minLength: 1,
      },
      title: {
        type: 'string',
        minLength: 1,
      },
      fileUrl: { format: 'uri' },
    },
    required: ['content', 'title', 'fileUrl'],
    additionalProperties: false,
  },
  createComment: {
    properties: {
      comment: {
        type: 'string',
        minLength: 1,
      },
      groupDiscussionId: {
        format: 'uuid',
      },
      photoUrl: {
        format: 'uri',
      },
      attachmentUrl: {
        format: 'uri',
      },
    },
    required: ['comment'],
    additionalProperties: false,
  },
};

export default validationSchemas;
