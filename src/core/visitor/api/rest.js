import { Router } from 'express';
import {
  USER_ROLES,
  VISITOR_STATUS,
  VISITOR_VENDOR_TYPES,
} from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';
import moment from 'moment';
import {
  sendNotificationToRentalUnit,
  sendNotificationToSocietyGuard,
} from '../../../utils/helpers.js';

const router = Router();

/**
 * Add pre-approved visitors
 * 1. Delivery (to leave at gate/noop)
 * 2. Cab (last 4 digits of vehicle number)
 * 3. Visitor (phone number)
 * Fields: When to when, name of vendor/person,
 * Type: Above
 * RentalUnitId
 */

router.post('/add-pre-approved', async (req, res) => {
  try {
    const {
      type,
      name,
      approvedFrom,
      approvedTill,
      mobileNumber,
      vehicleNumber,
      rentalUnitId,
      vendorName,
      visitorCount,
      leaveParcelAtGate,
    } = req.body;

    const [userRole] = await KNEX(TABLES.UserRoles)
      .where({
        userId: req.user.id,
        role: USER_ROLES.RESIDENT,
      })
      .limit(1);

    if (!userRole) throw new Error('Invalid user');

    const [{ id: visitorId }] = await KNEX(TABLES.Visitors)
      .insert({
        type: type.toUpperCase(),
        name,
        approvedFrom,
        approvedTill,
        mobileNumber,
        vehicleNumber,
        rentalUnitId,
        vendorName,
        visitorCount,
        leaveParcelAtGate,
        status: VISITOR_STATUS.PRE_APPROVED,
      })
      .returning('id');

    await KNEX(TABLES.VisitorStatus).insert({
      visitorId,
      name: VISITOR_STATUS.PRE_APPROVED,
      actionByUserId: req.user.id,
    });

    await sendNotificationToSocietyGuard({
      societyId: userRole.societyId,
      title: `New pre approved ${type} created`,
      message: `${type} pre-approved by ${req.user.firstName}`,
    });

    if (leaveParcelAtGate === true) {
      await sendNotificationToSocietyGuard({
        societyId: userRole.societyId,
        title: 'Collect parcel',
        message: `Collect parcel for ${req.user.firstName}`,
      });
    }

    return res.json({ success: true, message: 'Visitor added successfully' });
  } catch (error) {
    console.log(`Error while adding visitor: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

/**
 * Guard can mark these visitors as entered
 */

router.post('/allow-entry', async (req, res) => {
  try {
    const { visitorId } = req.body;

    const [visitor] = await KNEX(TABLES.Visitors)
      .where({ id: visitorId })
      .limit(1);

    if (!visitor) {
      throw Error('Invalid visitor id');
    }

    await KNEX(TABLES.Visitors)
      .update({
        status: VISITOR_STATUS.ALLOWED_ENTRY,
      })
      .where({ id: visitorId });

    await KNEX(TABLES.VisitorStatus).insert({
      visitorId,
      name: VISITOR_STATUS.ALLOWED_ENTRY,
      actionByUserId: req.user.id,
    });

    await sendNotificationToRentalUnit({
      rentalUnitId: visitor.rentalUnitId,
      message: `${visitor.name} allowed entry`,
      title: 'Visitor allowed entry',
    });

    return res.json({ success: true, message: 'Visitor allowed entry' });
  } catch (error) {
    console.log(`Error while adding visitor: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get('/pre-approved', async (req, res) => {
  try {
    const { societyId } = req.query;

    const preApprovedVisitorsPromise = KNEX(TABLES.Visitors)
      .select([
        `${TABLES.Visitors}.id as visitorId`,
        `${TABLES.Visitors}.createdAt as createdAt`,
        `${TABLES.Visitors}.updatedAt as updatedAt`,
        `${TABLES.Visitors}.approvedFrom as approvedFrom`,
        `${TABLES.Visitors}.approvedTill as approvedTill`,
        `${TABLES.Visitors}.type as type`,
        `${TABLES.Visitors}.status as status`,
        `${TABLES.Visitors}.name as visitorName`,
        `${TABLES.Visitors}.mobileNumber as mobileNumber`,
        `${TABLES.Visitors}.vehicleNumber as vehicleNumber`,
        `${TABLES.Visitors}.rentalUnitId as rentalUnitId`,
        `${TABLES.Visitors}.vendorName as vendorName`,
        `${TABLES.Visitors}.visitorCount as visitorCount`,
        `${TABLES.Visitors}.image as image`,
        `${TABLES.Visitors}.isWearingMask as isWearingMask`,
        `${TABLES.Visitors}.temperature as temperature`,
        `${TABLES.Visitors}.leaveParcelAtGate as leaveParcelAtGate`,
        `${TABLES.Visitors}.imageUrl as imageUrl`,
        `${TABLES.RentalUnits}.id as rentalUnitId`,
        `${TABLES.RentalUnits}.type as rentalUnitType`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
        `${TABLES.Users}.firstName as approvedByFirstName`,
        `${TABLES.Users}.lastName as approvedByLastName`,
      ])
      .leftJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Visitors}.rentalUnitId`,
      )
      .leftJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .leftJoin(
        TABLES.VisitorStatus,
        `${TABLES.VisitorStatus}.visitorId`,
        `${TABLES.Visitors}.id`,
      )
      .leftJoin(
        TABLES.Users,
        `${TABLES.VisitorStatus}.actionByUserId`,
        `${TABLES.Users}.id`,
      )
      .whereIn(`${TABLES.Visitors}.status`, [VISITOR_STATUS.PRE_APPROVED])
      .andWhere(`${TABLES.Visitors}.approvedFrom`, '<=', moment().toISOString())
      .andWhere(`${TABLES.Visitors}.approvedTill`, '>=', moment().toISOString())
      .andWhere({
        [`${TABLES.RentalUnits}.societyId`]: societyId,
        [`${TABLES.VisitorStatus}.name`]: VISITOR_STATUS.PRE_APPROVED,
      });

    const approvedVisitorsPromise = KNEX(TABLES.Visitors)
      .select([
        `${TABLES.Visitors}.id as visitorId`,
        `${TABLES.Visitors}.createdAt as createdAt`,
        `${TABLES.Visitors}.updatedAt as updatedAt`,
        `${TABLES.Visitors}.approvedFrom as approvedFrom`,
        `${TABLES.Visitors}.approvedTill as approvedTill`,
        `${TABLES.Visitors}.type as type`,
        `${TABLES.Visitors}.status as status`,
        `${TABLES.Visitors}.name as visitorName`,
        `${TABLES.Visitors}.mobileNumber as mobileNumber`,
        `${TABLES.Visitors}.vehicleNumber as vehicleNumber`,
        `${TABLES.Visitors}.rentalUnitId as rentalUnitId`,
        `${TABLES.Visitors}.vendorName as vendorName`,
        `${TABLES.Visitors}.visitorCount as visitorCount`,
        `${TABLES.Visitors}.image as image`,
        `${TABLES.Visitors}.isWearingMask as isWearingMask`,
        `${TABLES.Visitors}.temperature as temperature`,
        `${TABLES.Visitors}.leaveParcelAtGate as leaveParcelAtGate`,
        `${TABLES.Visitors}.imageUrl as imageUrl`,
        `${TABLES.RentalUnits}.id as rentalUnitId`,
        `${TABLES.RentalUnits}.type as rentalUnitType`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
        `${TABLES.Users}.firstName as approvedByFirstName`,
        `${TABLES.Users}.lastName as approvedByLastName`,
      ])
      .leftJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Visitors}.rentalUnitId`,
      )
      .leftJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .leftJoin(
        TABLES.VisitorStatus,
        `${TABLES.VisitorStatus}.visitorId`,
        `${TABLES.Visitors}.id`,
      )
      .leftJoin(
        TABLES.Users,
        `${TABLES.VisitorStatus}.actionByUserId`,
        `${TABLES.Users}.id`,
      )
      .whereIn(`${TABLES.Visitors}.status`, [VISITOR_STATUS.APPROVED])
      .andWhere({
        [`${TABLES.RentalUnits}.societyId`]: societyId,
        [`${TABLES.VisitorStatus}.name`]: VISITOR_STATUS.APPROVED,
      });

    const deniedVisitorsPromise = KNEX(TABLES.Visitors)
      .select([
        `${TABLES.Visitors}.id as visitorId`,
        `${TABLES.Visitors}.createdAt as createdAt`,
        `${TABLES.Visitors}.updatedAt as updatedAt`,
        `${TABLES.Visitors}.approvedFrom as approvedFrom`,
        `${TABLES.Visitors}.approvedTill as approvedTill`,
        `${TABLES.Visitors}.type as type`,
        `${TABLES.Visitors}.status as status`,
        `${TABLES.Visitors}.name as visitorName`,
        `${TABLES.Visitors}.mobileNumber as mobileNumber`,
        `${TABLES.Visitors}.vehicleNumber as vehicleNumber`,
        `${TABLES.Visitors}.rentalUnitId as rentalUnitId`,
        `${TABLES.Visitors}.vendorName as vendorName`,
        `${TABLES.Visitors}.visitorCount as visitorCount`,
        `${TABLES.Visitors}.image as image`,
        `${TABLES.Visitors}.isWearingMask as isWearingMask`,
        `${TABLES.Visitors}.temperature as temperature`,
        `${TABLES.Visitors}.leaveParcelAtGate as leaveParcelAtGate`,
        `${TABLES.Visitors}.imageUrl as imageUrl`,
        `${TABLES.RentalUnits}.id as rentalUnitId`,
        `${TABLES.RentalUnits}.type as rentalUnitType`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
        `${TABLES.Users}.firstName as approvedByFirstName`,
        `${TABLES.Users}.lastName as approvedByLastName`,
      ])
      .leftJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Visitors}.rentalUnitId`,
      )
      .leftJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .leftJoin(
        TABLES.VisitorStatus,
        `${TABLES.VisitorStatus}.visitorId`,
        `${TABLES.Visitors}.id`,
      )
      .leftJoin(
        TABLES.Users,
        `${TABLES.VisitorStatus}.actionByUserId`,
        `${TABLES.Users}.id`,
      )
      .whereIn(`${TABLES.Visitors}.status`, [VISITOR_STATUS.DENIED])
      .andWhere({
        [`${TABLES.RentalUnits}.societyId`]: societyId,
        [`${TABLES.VisitorStatus}.name`]: VISITOR_STATUS.DENIED,
      });

    const pendingApprovalVisitorsPromise = KNEX(TABLES.Visitors)
      .select([
        `${TABLES.Visitors}.id as visitorId`,
        `${TABLES.Visitors}.createdAt as createdAt`,
        `${TABLES.Visitors}.updatedAt as updatedAt`,
        `${TABLES.Visitors}.approvedFrom as approvedFrom`,
        `${TABLES.Visitors}.approvedTill as approvedTill`,
        `${TABLES.Visitors}.type as type`,
        `${TABLES.Visitors}.status as status`,
        `${TABLES.Visitors}.name as visitorName`,
        `${TABLES.Visitors}.mobileNumber as mobileNumber`,
        `${TABLES.Visitors}.vehicleNumber as vehicleNumber`,
        `${TABLES.Visitors}.rentalUnitId as rentalUnitId`,
        `${TABLES.Visitors}.vendorName as vendorName`,
        `${TABLES.Visitors}.visitorCount as visitorCount`,
        `${TABLES.Visitors}.image as image`,
        `${TABLES.Visitors}.isWearingMask as isWearingMask`,
        `${TABLES.Visitors}.temperature as temperature`,
        `${TABLES.Visitors}.leaveParcelAtGate as leaveParcelAtGate`,
        `${TABLES.Visitors}.imageUrl as imageUrl`,
        `${TABLES.RentalUnits}.id as rentalUnitId`,
        `${TABLES.RentalUnits}.type as rentalUnitType`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
        `${TABLES.Visitors}.parcelCollectedBy as approvedByFirstName`,
        `${TABLES.Visitors}.parcelCollectedBy as approvedByLastName`,
      ])
      .leftJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Visitors}.rentalUnitId`,
      )
      .leftJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .leftJoin(
        TABLES.VisitorStatus,
        `${TABLES.VisitorStatus}.visitorId`,
        `${TABLES.Visitors}.id`,
      )
      .leftJoin(
        TABLES.Users,
        `${TABLES.VisitorStatus}.actionByUserId`,
        `${TABLES.Users}.id`,
      )
      .whereIn(`${TABLES.Visitors}.status`, [VISITOR_STATUS.PENDING_APPROVAL])
      .andWhere({
        [`${TABLES.RentalUnits}.societyId`]: societyId,
        [`${TABLES.VisitorStatus}.name`]: VISITOR_STATUS.PENDING_APPROVAL,
      });

    const [
      preApprovedVisitors,
      pendingApprovalVisitors,
      approvedVisitors,
      deniedVisitors,
    ] = await Promise.all([
      preApprovedVisitorsPromise,
      pendingApprovalVisitorsPromise,
      approvedVisitorsPromise,
      deniedVisitorsPromise,
    ]);

    const unionArray = approvedVisitors
      .concat(deniedVisitors)
      .concat(pendingApprovalVisitors)
      .filter((item, index, self) => {
        return (
          index === self.findIndex((obj) => obj.visitorId === item.visitorId)
        );
      });

    return res.json({
      success: true,
      data: [...preApprovedVisitors, ...unionArray],
    });
  } catch (error) {
    console.log(`Error while fetching visitors pre-approved: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get('/pre-approved-delivery', async (req, res) => {
  try {
    const { societyId } = req.query;

    const visitors = await KNEX(TABLES.Visitors)
      .select([
        `${TABLES.Visitors}.id as visitorId`,
        `${TABLES.Visitors}.createdAt as createdAt`,
        `${TABLES.Visitors}.updatedAt as updatedAt`,
        `${TABLES.Visitors}.approvedFrom as approvedFrom`,
        `${TABLES.Visitors}.approvedTill as approvedTill`,
        `${TABLES.Visitors}.type as type`,
        `${TABLES.Visitors}.status as status`,
        `${TABLES.Visitors}.name as name`,
        `${TABLES.Visitors}.mobileNumber as mobileNumber`,
        `${TABLES.Visitors}.vehicleNumber as vehicleNumber`,
        `${TABLES.Visitors}.rentalUnitId as rentalUnitId`,
        `${TABLES.Visitors}.vendorName as vendorName`,
        `${TABLES.Visitors}.visitorCount as visitorCount`,
        `${TABLES.Visitors}.image as image`,
        `${TABLES.Visitors}.isWearingMask as isWearingMask`,
        `${TABLES.Visitors}.temperature as temperature`,
        `${TABLES.Visitors}.leaveParcelAtGate as leaveParcelAtGate`,
        `${TABLES.Visitors}.imageUrl as imageUrl`,
        `${TABLES.RentalUnits}.id as rentalUnitId`,
        `${TABLES.RentalUnits}.type as rentalUnitType`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
        `${TABLES.Users}.firstName as approvedByFirstName`,
        `${TABLES.Users}.lastName as approvedByLastName`,
      ])
      .leftJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Visitors}.rentalUnitId`,
      )
      .leftJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .leftJoin(
        TABLES.VisitorStatus,
        `${TABLES.VisitorStatus}.visitorId`,
        `${TABLES.Visitors}.id`,
      )
      .leftJoin(
        TABLES.Users,
        `${TABLES.VisitorStatus}.actionByUserId`,
        `${TABLES.Users}.id`,
      )
      .where(`${TABLES.Visitors}.approvedFrom`, '<=', moment().toISOString())
      .andWhere(`${TABLES.Visitors}.approvedTill`, '>=', moment().toISOString())
      .andWhere({
        [`${TABLES.RentalUnits}.societyId`]: societyId,
        [`${TABLES.Visitors}.status`]: VISITOR_STATUS.PRE_APPROVED,
        [`${TABLES.VisitorStatus}.name`]: VISITOR_STATUS.PRE_APPROVED,
        [`${TABLES.Visitors}.type`]: VISITOR_VENDOR_TYPES.DELIVERY,
      });

    return res.json({ success: true, data: visitors });
  } catch (error) {
    console.log(`Error while fetching delivery visitors: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get('/inside-building', async (req, res) => {
  try {
    const { societyId } = req.query;

    const visitors = await KNEX(TABLES.Visitors)
      .select([
        `${TABLES.Visitors}.id as visitorId`,
        `${TABLES.Visitors}.type as visitorType`,
        `${TABLES.Visitors}.name as visitorName`,
        `${TABLES.Visitors}.imageUrl as imageUrl`,
        `${TABLES.Visitors}.status`,
        `${TABLES.Visitors}.temperature`,
        `${TABLES.Visitors}.isWearingMask as isWearingMask`,
        `${TABLES.Visitors}.mobileNumber as mobileNumber`,
        `${TABLES.Visitors}.vehicleNumber as vehicleNumber`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.RentalUnits}.type as rentalUnitType`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
        `${TABLES.Visitors}.createdAt as createdAt`,
        `${TABLES.Visitors}.updatedAt as updatedAt`,
        `${TABLES.Users}.firstName as approvedByFirstName`,
        `${TABLES.Users}.lastName as approvedByLastName`,
      ])
      .leftJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Visitors}.rentalUnitId`,
      )
      .leftJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .leftJoin(
        TABLES.VisitorStatus,
        `${TABLES.VisitorStatus}.visitorId`,
        `${TABLES.Visitors}.id`,
      )
      .leftJoin(
        TABLES.Users,
        `${TABLES.VisitorStatus}.actionByUserId`,
        `${TABLES.Users}.id`,
      )
      .where({
        [`${TABLES.RentalUnits}.societyId`]: societyId,
        [`${TABLES.Visitors}.status`]: VISITOR_STATUS.ALLOWED_ENTRY,
      })
      .whereIn(`${TABLES.VisitorStatus}.name`, [
        VISITOR_STATUS.APPROVED,
        VISITOR_STATUS.PRE_APPROVED,
      ]);

    const pendingApprovalVisitors = await KNEX(TABLES.Visitors)
      .select([
        `${TABLES.Visitors}.id as visitorId`,
        `${TABLES.Visitors}.type as visitorType`,
        `${TABLES.Visitors}.name as visitorName`,
        `${TABLES.Visitors}.imageUrl as imageUrl`,
        `${TABLES.Visitors}.status`,
        `${TABLES.Visitors}.temperature`,
        `${TABLES.Visitors}.isWearingMask as isWearingMask`,
        `${TABLES.Visitors}.mobileNumber as mobileNumber`,
        `${TABLES.Visitors}.vehicleNumber as vehicleNumber`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.RentalUnits}.type as rentalUnitType`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
        `${TABLES.Visitors}.createdAt as createdAt`,
        `${TABLES.Visitors}.updatedAt as updatedAt`,
        `${TABLES.Users}.firstName as approvedByFirstName`,
        `${TABLES.Users}.lastName as approvedByLastName`,
      ])
      .leftJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Visitors}.rentalUnitId`,
      )
      .leftJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .leftJoin(
        TABLES.VisitorStatus,
        `${TABLES.VisitorStatus}.visitorId`,
        `${TABLES.Visitors}.id`,
      )
      .leftJoin(
        TABLES.Users,
        `${TABLES.VisitorStatus}.actionByUserId`,
        `${TABLES.Users}.id`,
      )
      .where({
        [`${TABLES.RentalUnits}.societyId`]: societyId,
        [`${TABLES.Visitors}.status`]: VISITOR_STATUS.ALLOWED_ENTRY,
      })
      .whereIn(`${TABLES.VisitorStatus}.name`, [
        VISITOR_STATUS.PENDING_APPROVAL,
      ]);

    const unionArray = visitors
      .concat(pendingApprovalVisitors)
      .filter((item, index, self) => {
        return (
          index === self.findIndex((obj) => obj.visitorId === item.visitorId)
        );
      });

    return res.json({ success: true, data: unionArray });
  } catch (error) {
    console.log(
      `Error while fetching visitors inside-building: ${error.message}`,
    );
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.post('/mark-exit', async (req, res) => {
  try {
    const { visitorId } = req.body;

    const [visitor] = await KNEX(TABLES.Visitors)
      .where({ id: visitorId })
      .whereIn(`${TABLES.Visitors}.status`, [VISITOR_STATUS.ALLOWED_ENTRY]);

    if (!visitor) {
      throw Error('Action not allowed');
    }

    await KNEX(TABLES.Visitors)
      .update({
        status: VISITOR_STATUS.EXITED,
      })
      .where({ id: visitorId });

    await KNEX(TABLES.VisitorStatus).insert({
      visitorId,
      name: VISITOR_STATUS.EXITED,
      actionByUserId: req.user.id,
    });

    await sendNotificationToRentalUnit({
      rentalUnitId: visitor.rentalUnitId,
      message: `${visitor.name} exited the building`,
      title: 'Visitor exited',
    });

    return res.json({ success: true, message: 'Visitor exited building' });
  } catch (error) {
    console.log(`Error while adding visitor: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.post('/receive-parcel-at-gate', async (req, res) => {
  try {
    const { visitorId } = req.body;

    const [visitor] = await KNEX(TABLES.Visitors)
      .where({ id: visitorId })
      .limit(1);

    if (!visitor) {
      throw Error('Invalid visitor id');
    }

    await KNEX(TABLES.Visitors)
      .update({
        status: VISITOR_STATUS.RECEIVED_AT_GATE,
      })
      .where({ id: visitorId });

    await KNEX(TABLES.VisitorStatus).insert({
      visitorId,
      name: VISITOR_STATUS.RECEIVED_AT_GATE,
      actionByUserId: req.user.id,
    });

    await sendNotificationToRentalUnit({
      rentalUnitId: visitor.rentalUnitId,
      title: 'Parcel received at gate',
      message: `${req.user?.firstName} has received parcel at gate`,
    });

    return res.json({ success: true, message: 'Parcel received at gate' });
  } catch (error) {
    console.log(`Error while adding visitor: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get('/parcels-at-gate', async (req, res) => {
  try {
    const { societyId } = req.query;

    const visitors = await KNEX(TABLES.Visitors)
      .select([
        `${TABLES.Visitors}.id as visitorId`,
        `${TABLES.Visitors}.type as visitorType`,
        `${TABLES.Visitors}.name as visitorName`,
        `${TABLES.Visitors}.imageUrl as imageUrl`,
        `${TABLES.Visitors}.status as visitorStatus`,
        `${TABLES.Visitors}.type as visitorType`,
        `${TABLES.Visitors}.mobileNumber as visitorMobileNumber`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
        `${TABLES.Visitors}.createdAt as createdAt`,
        `${TABLES.Visitors}.updatedAt as updatedAt`,
      ])
      .whereIn(`${TABLES.Visitors}.status`, [
        VISITOR_STATUS.APPROVED,
        VISITOR_STATUS.RECEIVED_AT_GATE,
      ])
      .andWhere({
        [`${TABLES.RentalUnits}.societyId`]: societyId,
        [`${TABLES.Visitors}.type`]: VISITOR_VENDOR_TYPES.DELIVERY,
      })
      .leftJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Visitors}.rentalUnitId`,
      )
      .leftJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      );

    return res.json({ success: true, data: visitors });
  } catch (error) {
    console.log(
      `Error while fetching visitors parcel-at-gate: ${error.message}`,
    );
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.post('/collect-parcel-by-tenant', async ({ body, user }, res) => {
  try {
    requestValidator(body, validationSchemas.updateParcelCollected);

    const { visitorId, parcelCollectedBy, imageUrl } = body;

    await KNEX(TABLES.Visitors)
      .update({
        status: VISITOR_STATUS.COLLECTED,
        parcelCollectedBy,
        imageUrl,
      })
      .where({ id: visitorId });

    await KNEX(TABLES.VisitorStatus).insert({
      visitorId,
      name: VISITOR_STATUS.COLLECTED,
      actionByUserId: user.id,
    });

    return res.json({ success: true, message: 'Parcel collected' });
  } catch (error) {
    console.log(`Error while adding visitor: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get('/collected-parcels', async (req, res) => {
  try {
    const { societyId } = req.query;

    const twoDaysAgo = moment()
      .subtract(2, 'days')
      .startOf('day')
      .toISOString();

    const visitors = await KNEX(TABLES.Visitors)
      .select([
        `${TABLES.Visitors}.id as visitorId`,
        `${TABLES.Visitors}.type as visitorType`,
        `${TABLES.Visitors}.name as visitorName`,
        `${TABLES.Visitors}.imageUrl as imageUrl`,
        `${TABLES.Visitors}.status`,
        `${TABLES.RentalUnits}.name as rentalUnitName`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.name as blockName`,
        `${TABLES.Visitors}.createdAt as createdAt`,
        `${TABLES.Visitors}.updatedAt as updatedAt`,
        `${TABLES.Users}.firstName as collectorFirstName`,
        `${TABLES.Users}.middleName as collectorMiddleName`,
        `${TABLES.Users}.lastName as collectorLastName`,
      ])
      .whereIn(`${TABLES.Visitors}.status`, [VISITOR_STATUS.COLLECTED])
      .andWhere(`${TABLES.Visitors}.updatedAt`, '>=', twoDaysAgo)
      .andWhere({
        [`${TABLES.RentalUnits}.societyId`]: societyId,
        [`${TABLES.Visitors}.type`]: VISITOR_VENDOR_TYPES.DELIVERY,
      })
      .leftJoin(
        TABLES.RentalUnits,
        `${TABLES.RentalUnits}.id`,
        `${TABLES.Visitors}.rentalUnitId`,
      )
      .leftJoin(
        TABLES.Floors,
        `${TABLES.Floors}.id`,
        `${TABLES.RentalUnits}.floorId`,
      )
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .leftJoin(
        TABLES.Users,
        `${TABLES.Users}.id`,
        `${TABLES.Visitors}.parcelCollectedBy`,
      );

    return res.json({ success: true, data: visitors });
  } catch (error) {
    console.log(
      `Error while fetching visitors collected-parcel: ${error.message}`,
    );
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.post('/new', async (req, res) => {
  try {
    const {
      type,
      name,
      mobileNumber,
      vehicleNumber,
      rentalUnitIds,
      vendorName,
      visitorCount,
      temperature,
      isWearingMask,
      image,
    } = req.body;

    if (!(rentalUnitIds instanceof Array))
      throw new Error('Rental unit id should be an array');

    for (let index = 0; index < rentalUnitIds.length; index++) {
      const rentalUnitId = rentalUnitIds[index];

      const [{ id: visitorId }] = await KNEX(TABLES.Visitors)
        .insert({
          type: type.toUpperCase(),
          name,
          mobileNumber,
          vehicleNumber,
          rentalUnitId,
          vendorName,
          visitorCount,
          status: VISITOR_STATUS.PENDING_APPROVAL,
          temperature,
          isWearingMask,
          image,
        })
        .returning('id');

      await KNEX(TABLES.VisitorStatus).insert({
        visitorId,
        name: VISITOR_STATUS.PENDING_APPROVAL,
        actionByUserId: req.user.id,
      });

      if (type.toLowerCase() === 'delivery') {
        await sendNotificationToRentalUnit({
          rentalUnitId,
          title: 'New delivery',
          message: `New delivery from ${vendorName} is pending for approval`,
          data: {
            type: 'delivery_entry',
            name: name,
            company: vendorName,
            phone: mobileNumber,
            image,
            visitorId,
          },
        });
      } else if (type.toLowerCase() === 'visitor') {
        await sendNotificationToRentalUnit({
          rentalUnitId,
          title: 'New visitor',
          message: `New visitor named ${name} is waiting for approval`,
          data: {
            type: 'visitor_entry',
            name: name,
            company: vendorName,
            phone: mobileNumber,
            image,
            visitorId,
          },
        });
      } else if (type.toLowerCase() === 'cab') {
        await sendNotificationToRentalUnit({
          rentalUnitId,
          title: 'New Cab',
          message: `New cab named ${name} is waiting for approval`,
          data: {
            type: 'cab_entry',
            name: name,
            company: vendorName,
            phone: mobileNumber,
            image,
            visitorId,
          },
        });
      }
    }

    return res.json({ success: true, message: 'Visitor added successfully' });
  } catch (error) {
    console.log(`Error while adding visitor: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get('/pending-for-rental-unit', async (req, res) => {
  try {
    const { rentalUnitId } = req.query;

    const visitors = await KNEX(TABLES.Visitors).where({
      rentalUnitId,
      status: VISITOR_STATUS.PENDING_APPROVAL,
    });

    return res.json({ success: true, data: visitors });
  } catch (error) {
    console.log(
      `Error while fetching visitors pending-for-rental-unit: ${error.message}`,
    );
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.post('/approve-pending', async (req, res) => {
  try {
    const { visitorId, leaveParcelAtGate = false } = req.body;

    const [visitor] = await KNEX(TABLES.Visitors)
      .where({ id: visitorId })
      .whereIn(`${TABLES.Visitors}.status`, [VISITOR_STATUS.PENDING_APPROVAL]);

    if (!visitor) {
      throw Error('Action not allowed');
    }

    const [userRole] = await KNEX(TABLES.UserRoles)
      .where({
        userId: req.user.id,
        role: USER_ROLES.RESIDENT,
      })
      .limit(1);

    if (!userRole) throw new Error('Invalid user');

    await KNEX(TABLES.Visitors)
      .where({
        id: visitorId,
        status: VISITOR_STATUS.PENDING_APPROVAL,
      })
      .update({ status: VISITOR_STATUS.APPROVED, leaveParcelAtGate });

    await KNEX(TABLES.VisitorStatus).insert({
      name: VISITOR_STATUS.APPROVED,
      visitorId,
      actionByUserId: req.user.id,
    });

    await sendNotificationToSocietyGuard({
      societyId: userRole.societyId,
      title: `${visitor.type} approved`,
      message: `${visitor.type} approved by ${req.user.firstName}`,
    });

    return res.json({ success: true, message: 'Visitor allowed entry' });
  } catch (error) {
    console.log(`Error while adding visitor: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.post('/deny-pending', async (req, res) => {
  try {
    const { visitorId } = req.body;

    const [userRole] = await KNEX(TABLES.UserRoles)
      .where({
        userId: req.user.id,
        role: USER_ROLES.RESIDENT,
      })
      .limit(1);

    if (!userRole) throw new Error('Invalid user');

    const visitor = await KNEX(TABLES.Visitors)
      .where({ id: visitorId })
      .whereIn(`${TABLES.Visitors}.status`, [VISITOR_STATUS.PENDING_APPROVAL]);

    if (visitor.length === 0) {
      throw Error('Action not allowed');
    }

    await KNEX(TABLES.Visitors)
      .where({
        id: visitorId,
        status: VISITOR_STATUS.PENDING_APPROVAL,
      })
      .update({ status: VISITOR_STATUS.DENIED });

    await KNEX(TABLES.VisitorStatus).insert({
      name: VISITOR_STATUS.DENIED,
      visitorId,
      actionByUserId: req.user.id,
    });

    await sendNotificationToSocietyGuard({
      societyId: userRole.societyId,
      title: `${visitor.type} denied`,
      message: `${visitor.type} denied by ${req.user.firstName}`,
    });

    return res.json({ success: true, message: 'Visitor denied entry' });
  } catch (error) {
    console.log(`Error while adding visitor: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.post('/vendor', async ({ body }, res) => {
  try {
    requestValidator(body, validationSchemas.addVisitorVendor);

    const { name, category } = body;

    const [vendor] = await KNEX(TABLES.VisitorVendors).where({
      name,
      category,
    });

    if (vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor with same name exists in this category already',
      });
    }

    await KNEX(TABLES.VisitorVendors).insert({ name, category });

    return res.json({ success: true, message: 'Vendor added successfully' });
  } catch (error) {
    console.log(`Error while adding vendor: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.delete(
  '/vendor',
  checkRole([USER_ROLES.SUPER_ADMIN]),
  async ({ body }, res) => {
    try {
      requestValidator(body, validationSchemas.deleteVisitorVendor);

      const { vendorId } = body;

      await KNEX(TABLES.VisitorVendors)
        .where({
          id: vendorId,
        })
        .del();

      return res.json({
        success: true,
        message: 'Vendor deleted successfully',
      });
    } catch (error) {
      console.log(`Error while deleting vendor: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get('/vendor', async ({ query }, res) => {
  try {
    requestValidator(query, validationSchemas.fetchVisitorVendorByCategory);

    const { category } = query;

    const vendors = await KNEX(TABLES.VisitorVendors).where({
      category,
    });

    return res.json({
      success: true,
      data: vendors,
    });
  } catch (error) {
    console.log(`Error while fetching vendors: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get('/vendor/all', async (req, res) => {
  try {
    const vendors = await KNEX(TABLES.VisitorVendors).orderBy('category');

    return res.json({
      success: true,
      data: vendors,
    });
  } catch (error) {
    console.log(`Error while fetching all vendors: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.get('/activity-for-rental-unit', async (req, res) => {
  try {
    const { rentalUnitId } = req.query;

    const visitors = await KNEX(TABLES.Visitors).where({
      rentalUnitId,
    });

    return res.json({ success: true, data: visitors });
  } catch (error) {
    console.log(
      `Error while fetching visitors activity-for-rental-unit: ${error.message}`,
    );
    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

export default router;
