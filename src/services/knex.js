import knex from 'knex';
import { KNEX_CONFIG } from '../env.js';

export const KNEX = knex(KNEX_CONFIG);

// console.log("knex-->",KNEX);

export const TABLES = {
  Advertisements: 'Advertisements',
  ActivityLogs: 'ActivityLogs',
  Amenities: 'Amenities',
  AmenityImages: 'AmenityImages',
  Blocks: 'Blocks',
  BookedAmenity: 'BookedAmenity',
  BookedAmenityStatus: 'BookedAmenityStatus',
  Cities: 'Cities',
  ComplaintCategories: 'ComplaintCategories',
  ComplaintComments: 'ComplaintComments',
  Complaints: 'Complaints',
  ComplaintStatus: 'ComplaintStatus',
  EmergencyContactCategories: 'EmergencyContactCategories',
  EmergencyContacts: 'EmergencyContacts',
  Floors: 'Floors',
  Gates: 'Gates',
  LocalServiceProviderAndRentalUnits: 'LocalServiceProviderAndRentalUnits',
  LocalServiceProviderAttendance: 'LocalServiceProviderAttendance',
  LocalServiceProviderLogs: 'LocalServiceProviderLogs',
  LocalServiceProviderRatings: 'LocalServiceProviderRatings',
  LocalServiceProviders: 'LocalServiceProviders',
  LocalServices: 'LocalServices',
  NoteToGuard: 'NoteToGuard',
  Notices: 'Notices',
  RentalUnits: 'RentalUnits',
  Societies: 'Societies',
  SocietyImages: 'SocietyImages',
  Sos: 'Sos',
  SosCategory: 'SosCategory',
  SosStatus: 'SosStatus',
  States: 'States',
  UserRoles: 'UserRoles',
  UserRoleStatus: 'UserRoleStatus',
  Users: 'Users',
  Vehicles: 'Vehicles',
  Visitors: 'Visitors',
  VisitorStatus: 'VisitorStatus',
  VisitorVendors: 'VisitorVendors',
  UserDeviceInfo: 'UserDeviceInfo',
  GroupDiscussion: 'GroupDiscussion',
  GroupDiscussionComments: 'GroupDiscussionComments',
  Accounts:'Accounts',
  GeneralLedger:'GeneralLedger',
  ChartOfAccount:'ChartOfAccount',
  TransactionDetails:'TransactionDetails',
  SocityBudget:'SocityBudget',
  Vendors:'Vendors', 
  VendorBookings:'VendorBookings',
  RentalSetup:'RentalSetup',
  ChargetList:'ChargetList',
};