import { AMENITY_TYPES } from '../../../constants.js';

const validationSchemas = {
  createAmenity: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3 },
      type: { type: 'string', enum: Object.keys(AMENITY_TYPES) },
      pricePerSlot: { type: 'number', minimum: 1 },
      maxCapacity: { type: 'number', minimum: 1 },
      advanceBookingLimitInDays: { type: 'number', minimum: 1 },
      images: {
        type: 'array',
        items: { format: 'uri' },
      },
    },
    required: ['name', 'type', 'pricePerSlot'],
    additionalProperties: false,
  },
  updateAmenity: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3 },
      type: { type: 'string', enum: Object.keys(AMENITY_TYPES) },
      pricePerSlot: { type: 'number', minimum: 1 },
      maxCapacity: { type: 'number', minimum: 1 },
      advanceBookingLimitInDays: { type: 'number', minimum: 1 },
      amenityId: { format: 'uuid' },
    },
    required: ['amenityId'],
    additionalProperties: false,
  },
  bookSlot: {
    properties: {
      amenityId: { format: 'uuid' },
      startTime: { format: 'date-time' },
      endTime: { format: 'date-time' },
    },
    required: ['amenityId', 'startTime', 'endTime'],
    additionalProperties: false,
  },
  cancelSlot: {
    properties: {
      bookedAmenityId: { format: 'uuid' },
    },
    required: ['bookedAmenityId'],
    additionalProperties: false,
  },
};

export default validationSchemas;
