import { Router } from 'express';
import authV1 from './auth/api/rest.js';
import superAdminV1 from './super-admin/api/rest.js';

import stateV1 from './state/api/rest.js';
import cityV1 from './city/api/rest.js';
import societyV1 from './society/api/rest.js';
import blockV1 from './block/api/rest.js';
import floorV1 from './floor/api/rest.js';
import rentalUnitV1 from './rental-unit/api/rest.js';
import userV1 from './user/api/rest.js';
import amenityV1 from './amenity/api/rest.js';
import sosV1 from './sos/api/rest.js';
import noticeV1 from './notice/api/rest.js';
import adV1 from './advertisement/api/rest.js';
import noteToGuardV1 from './note-to-guard/api/rest.js';

import complaintV1 from './complaint/api/rest.js';
import emergencyContactV1 from './emergency-contact/api/rest.js';
import localServiceV1 from './local-service/api/rest.js';
import localServiceProviderV1 from './local-service-provider/api/rest.js';
import visitorV1 from './visitor/api/rest.js';
import groupDiscussionV1 from './group-discussion/api/rest.js';


// payments module
import accountsV1 from './accounts/api/rest.js';
import generalLedgerV1 from './general-ledger/api/rest.js';
import chartOfAccountV1 from './chart-of-account/api/rest.js';
import transactionDetailsV1 from './cash-transfer-details/api/rest.js';
import socityBudgetV1 from './socity-budget/api/rest.js';
import vendorsManagementV1 from './vendors/api/rest.js';
import rentalSetupV1 from './rental-setup/api/rest.js';
import chargeListV1 from './charge-list/api/rest.js';



import { authenticateToken } from '../middlewares/jwt.js';
import { checkRole } from '../middlewares/checkRole.js';
import { CONSTANTS, USER_ROLES } from '../constants.js';
import { KNEX, TABLES } from '../services/knex.js';

const router = Router();

router.get('/ping', async (req, res) => {
  try {
    await KNEX(TABLES.Users).select('id').limit(1);

    res.json({ message: 'Pong' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/constants', authenticateToken, (req, res) => {
  try {
    return res.json({ success: true, data: CONSTANTS });
  } catch (error) {
    console.log(`Error while fetching constants: ${error}`);

    return res.json({ success: false, message: error.message });
  }
});

router.use('/v1/auth', authV1);
router.use(
  '/v1/advertisement',
  authenticateToken,
  adV1,
);
router.use('/v1/state', authenticateToken, stateV1);
router.use('/v1/city', authenticateToken, cityV1);
router.use('/v1/society', authenticateToken, societyV1);
router.use('/v1/block', authenticateToken, blockV1);
router.use('/v1/floor', authenticateToken, floorV1);
router.use('/v1/rental-unit', authenticateToken, rentalUnitV1);
router.use('/v1/complaint', authenticateToken, complaintV1);
router.use('/v1/user', authenticateToken, userV1);
router.use('/v1/sos', authenticateToken, sosV1);
router.use('/v1/amenity', authenticateToken, amenityV1);
router.use('/v1/notice', authenticateToken, noticeV1);
router.use('/v1/note-to-guard', authenticateToken, noteToGuardV1);
router.use('/v1/emergency-contact', authenticateToken, emergencyContactV1);
router.use('/v1/local-service', authenticateToken, localServiceV1);
router.use('/v1/visitor', authenticateToken, visitorV1);
router.use('/v1/group-discussion', authenticateToken, groupDiscussionV1);
router.use(
  '/v1/local-service-provider',
  authenticateToken,
  localServiceProviderV1,
);

router.use(
  '/v1/super-admin',
  authenticateToken,
  checkRole([USER_ROLES.SUPER_ADMIN]),
  superAdminV1,
);


router.use('/v1/accounts', accountsV1);
router.use('/v1/general-ledger', generalLedgerV1);
router.use('/v1/chart-of-account', chartOfAccountV1);
router.use('/v1/transaction-details', transactionDetailsV1);
router.use('/v1/socity-budget', socityBudgetV1);
router.use('/v1/vendors', vendorsManagementV1);
router.use('/v1/rental-setup', rentalSetupV1);
router.use('/v1/charge-list', chargeListV1);


export default router;
