import { VISITOR_VENDOR_TYPES } from '../../../constants.js';

const validationSchemas = {
  addVisitorVendor: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3 },
      category: { type: 'string', enum: Object.keys(VISITOR_VENDOR_TYPES) },
    },
    required: ['name', 'category'],
    additionalProperties: false,
  },
  deleteVisitorVendor: {
    type: 'object',
    properties: {
      vendorId: { format: 'uuid' },
    },
    required: ['vendorId'],
    additionalProperties: false,
  },
  updateParcelCollected: {
    type: 'object',
    properties: {
      visitorId: { format: 'uuid' },
      parcelCollectedBy: { format: 'uuid' },
      imageUrl: { format: 'uri' },
    },
    required: ['visitorId', 'parcelCollectedBy'],
    additionalProperties: false,
  },
  fetchVisitorVendorByCategory: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: Object.keys(VISITOR_VENDOR_TYPES) },
    },
    required: ['category'],
    additionalProperties: false,
  },
};

export default validationSchemas;
