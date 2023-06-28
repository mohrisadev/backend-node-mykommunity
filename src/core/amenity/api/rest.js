import { Router } from 'express';
import moment from 'moment';
import { AMENITY_STATUS, USER_ROLES } from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';
import imageRoutes from '../components/images/api/rest.js';
import { sendNotificationToRentalUnit } from '../../../utils/helpers.js';

const router = new Router();

router.use('/image', checkRole([USER_ROLES.SOCIETY_ADMIN]), imageRoutes);

router.post(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ user, body }, res) => {
    try {
      requestValidator(body, validationSchemas.createAmenity);

      const {
        name,
        type,
        pricePerSlot,
        images,
        maxCapacity,
        advanceBookingLimitInDays,
      } = body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SOCIETY_ADMIN,
        })
        .limit(1)
        .select('societyId');

      if (!userRole?.societyId)
        throw new Error(`User not associated to society`);

      const [nameExists] = await KNEX(TABLES.Amenities)
        .where({
          societyId: userRole.societyId,
          name,
        })
        .limit(1);

      if (nameExists)
        throw new Error(`Amenity with name ${name} already exists`);

      const [{ id: amenityId }] = await KNEX(TABLES.Amenities)
        .insert({
          societyId: userRole.societyId,
          name,
          type,
          pricePerSlot,
          maxCapacity,
          advanceBookingLimitInDays,
        })
        .returning('id');

      if (images?.length > 0) {
        const imagesData = images.map((image) => {
          return { imageUrl: image.trim(), amenityId };
        });

        await KNEX(TABLES.AmenityImages).insert(imagesData);
      }

      return res.json({ success: true });
    } catch (error) {
      console.log(`Error while creating amenity: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.patch(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.updateAmenity);

      const { name, amenityId } = body;

      const userRolePromise = KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SOCIETY_ADMIN,
        })
        .limit(1)
        .select('societyId');

      const amenityPromise = KNEX(TABLES.Amenities)
        .where({ id: amenityId })
        .limit(1);

      let nameExistsPromise = Promise.resolve([false]);
      if (name)
        nameExistsPromise = KNEX(TABLES.Amenities).where({ name }).limit(1);

      const [[userRole], [amenity], [nameExists]] = await Promise.all([
        userRolePromise,
        amenityPromise,
        nameExistsPromise,
      ]);

      if (!amenity) throw new Error('Invalid amenity');

      if (amenity.societyId !== userRole?.societyId)
        throw Error('Invalid user permission');

      if (nameExists) throw new Error('Name already exists');

      delete body.amenityId;

      await KNEX(TABLES.Amenities).where({ id: amenityId }).update(body);

      return res.json({
        success: true,
        message: 'Amenity was successfully updated',
      });
    } catch (error) {
      console.log(`Error while updating amenity: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get(
  '/admin',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ user }, res) => {
    try {
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SOCIETY_ADMIN,
        })
        .limit(1)
        .select('societyId');

      if (!userRole?.societyId)
        throw new Error('User not associated to any society');

      const amenities = await KNEX(TABLES.Amenities).where({
        societyId: userRole?.societyId,
      });

      return res.json({ success: true, data: amenities });
    } catch (error) {
      console.log(
        `Error while fetching amenity list for admin: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.patch(
  '/toggle',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.updateAmenity);

      const { amenityId } = body;

      const userRolePromise = KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SOCIETY_ADMIN,
        })
        .limit(1)
        .select('societyId');

      const amenityPromise = KNEX(TABLES.Amenities)
        .where({ id: amenityId })
        .limit(1);

      const [[userRole], [amenity]] = await Promise.all([
        userRolePromise,
        amenityPromise,
      ]);

      if (!amenity) throw new Error('Invalid amenity');

      if (amenity.societyId !== userRole?.societyId)
        throw Error('Invalid user permission');

      await KNEX(TABLES.Amenities)
        .where({ id: amenityId })
        .update({ isActive: !amenity.isActive });

      return res.json({
        success: true,
        message: `Amenity was ${amenity.isActive ? 'disabled' : 'enabled'}`,
      });
    } catch (error) {
      console.log(`Error while toggling amenity : ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get(
  '/resident',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ user }, res) => {
    try {
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1)
        .select('societyId');

      if (!userRole?.societyId)
        throw new Error('User not associated to any society');

      const amenities = await KNEX(TABLES.Amenities).where({
        societyId: userRole?.societyId,
        isActive: true,
      });

      return res.json({ success: true, data: amenities });
    } catch (error) {
      console.log(
        `Error while fetching amenity list for residents: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/book',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ user, body }, res) => {
    try {
      requestValidator(body, validationSchemas.bookSlot);

      let { amenityId, startTime, endTime } = body;

      const [amenity] = await KNEX(TABLES.Amenities)
        .where({ id: amenityId })
        .limit(1);

      if (!amenity) {
        throw new Error('Invalid amenity id');
      }

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1)
        .select('rentalUnitId');

      if (!userRole?.rentalUnitId)
        throw new Error('User not linked to rental unit');

      startTime = moment(startTime).startOf(
        amenity.type === 'HOURLY' ? 'hour' : 'day',
      );

      // checking if start time is in advanceBookingLimitInDays
      const diffBetweenStartDateAndCurrentTime = parseInt(
        startTime.diff(moment(), 'days'),
      );

      if (
        typeof amenity.advanceBookingLimitInDays === 'number' &&
        diffBetweenStartDateAndCurrentTime > amenity.advanceBookingLimitInDays
      ) {
        throw new Error(
          `You cannot book amenity before ${amenity.advanceBookingLimitInDays} days of slot`,
        );
      }

      endTime = moment(endTime)
        .endOf(amenity.type === 'HOURLY' ? 'hour' : 'day')
        .add(1, amenity.type === 'HOURLY' ? 'hour' : 'day');

      const numberOfSlots = parseInt(
        endTime.diff(startTime, amenity.type === 'HOURLY' ? 'hours' : 'days'),
      );

      startTime = startTime.toISOString();
      endTime = endTime.toISOString();

      if (
        startTime < moment().toISOString() ||
        endTime < moment().toISOString()
      ) {
        throw new Error('Please select time in future');
      }

      if (startTime >= endTime) {
        throw new Error('Start time must be smaller than end time');
      }

      const isSlotBookedQuesry = `
	  	select "BookedAmenity"."id"
		from "BookedAmenity"
		where "BookedAmenity"."amenityId" = '${amenityId}'
		and "BookedAmenity"."status" = '${AMENITY_STATUS.BOOKED}'
		and (
			"BookedAmenity"."startTime" between '${startTime}' and '${endTime}'
			or "BookedAmenity"."endTime" between '${startTime}' and '${endTime}'
		)
	  `;

      const { rows: isSlotBooked } = await KNEX.raw(isSlotBookedQuesry);

      if (isSlotBooked.length > 0) throw new Error('Slot is already booked');

      const [booking] = await KNEX(TABLES.BookedAmenity)
        .insert({
          amenityId,
          userId: user.id,
          startTime,
          endTime,
          amountPaid: parseInt(
            Number(numberOfSlots) * Number(amenity.pricePerSlot),
          ),
          status: AMENITY_STATUS.BOOKED,
          rentalUnitId: userRole.rentalUnitId,
          slotsBooked: numberOfSlots,
        })
        .returning('id');

      await KNEX(TABLES.BookedAmenityStatus).insert({
        bookedAmenityId: booking.id,
        name: AMENITY_STATUS.BOOKED,
        message: 'Amenity booked',
      });

      await sendNotificationToRentalUnit({
        rentalUnitId: userRole.rentalUnitId,
        title: 'Amenity booked',
        message: `${amenity.name} booked from ${moment(startTime).format(
          'DD-MM-YYYY HH:mm',
        )} to ${moment(endTime).format('DD-MM-YYYY HH:mm')}`,
      });

      return res.json({ success: true, message: 'Amenity booked' });
    } catch (error) {
      console.log(`Error while booking amenity: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.post(
  '/cancel',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.cancelSlot);

      const { bookedAmenityId } = body;

      const [bookedAmenity] = await KNEX(TABLES.BookedAmenity)
        .where({
          id: bookedAmenityId,
          status: AMENITY_STATUS.BOOKED,
        })
        .limit(1);

      if (!bookedAmenity) throw new Error('Invalid booking selected');

      if (bookedAmenity.userId !== user.id)
        throw new Error('Invalid permission to cancel booking');

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1)
        .select('rentalUnitId');

      if (!userRole?.rentalUnitId)
        throw new Error('User not linked to rental unit');

      await KNEX(TABLES.BookedAmenity)
        .where({ id: bookedAmenityId })
        .update({ status: AMENITY_STATUS.CANCELLED });

      await KNEX(TABLES.BookedAmenityStatus).insert({
        bookedAmenityId,
        name: AMENITY_STATUS.CANCELLED,
        message: `Booking cancelled by userId: ${user.id}`,
      });

      await sendNotificationToRentalUnit({
        rentalUnitId: userRole.rentalUnitId,
        title: 'Amenity booking cancelled',
        message: `Booking cancelled by ${user.firstName}`,
      });

      return res.json({ success: true, message: 'Booking cancelled' });
    } catch (error) {
      console.log(`Error while cancelling amenity booking: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

// api to fetch past bookings(admin) (by societyId)
router.get(
  '/bookings/admin',
  checkRole([USER_ROLES.SOCIETY_ADMIN]),
  async ({ query, user }, res) => {
    try {
      const { status = 'ALL' } = query;

      if (!['ALL', ...Object.keys(AMENITY_STATUS)].includes(status)) {
        throw new Error('Invalid status');
      }

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SOCIETY_ADMIN,
        })
        .limit(1)
        .select('societyId');

      if (!userRole?.societyId)
        throw new Error(`User not associated to society`);

      const bookings = await KNEX(TABLES.BookedAmenity)
        .select([
          `${TABLES.Amenities}.name as amenityId`,
          `${TABLES.Amenities}.type as amenityType`,
          `${TABLES.Amenities}.pricePerSlot as amenityPriceperSlot`,
          `${TABLES.Amenities}.isActive as amenityisActive`,

          `${TABLES.Users}.id as userId`,
          `${TABLES.Users}.email as userEmail`,
          `${TABLES.Users}.mobileNumber as userMobileNumber`,
          `${TABLES.Users}.firstName as userFirstName`,
          `${TABLES.Users}.lastName as userlastName`,
          `${TABLES.Users}.profileImage as userprofileImage`,

          `${TABLES.BookedAmenity}.id as id`,
          `${TABLES.BookedAmenity}.startTime`,
          `${TABLES.BookedAmenity}.endTime`,
          `${TABLES.BookedAmenity}.amountPaid`,
          `${TABLES.BookedAmenity}.status`,
          `${TABLES.BookedAmenity}.slotsBooked`,
        ])
        .innerJoin(
          TABLES.Amenities,
          `${TABLES.Amenities}.id`,
          `${TABLES.BookedAmenity}.amenityId`,
        )
        .innerJoin(
          TABLES.Users,
          `${TABLES.Users}.id`,
          `${TABLES.BookedAmenity}.userId`,
        )
        .where({
          [`${TABLES.Amenities}.societyId`]: userRole?.societyId,
        })
        .orderBy(`${TABLES.BookedAmenity}.createdAt`, 'desc')
        .modify((queryBuilder) => {
          if (status === AMENITY_STATUS.BOOKED) {
            queryBuilder.where({ status: AMENITY_STATUS.BOOKED });
          }

          if (status === AMENITY_STATUS.CANCELLED) {
            queryBuilder.where({ status: AMENITY_STATUS.CANCELLED });
          }
        });

      for (let index = 0; index < bookings.length; index++) {
        const booking = bookings[index];

        const [rentalUnit] = await KNEX(TABLES.UserRoles)
          .select([
            `${TABLES.RentalUnits}.id as rentalUnitId`,
            `${TABLES.RentalUnits}.name as rentalUnitName`,
            `${TABLES.RentalUnits}.type as rentalUnitType`,
            `${TABLES.Floors}.id as floorId`,
            `${TABLES.Floors}.name as floorName`,
            `${TABLES.Blocks}.id as blockId`,
            `${TABLES.Blocks}.name as blockName`,
          ])
          .innerJoin(
            TABLES.RentalUnits,
            `${TABLES.RentalUnits}.id`,
            `${TABLES.UserRoles}.rentalUnitId`,
          )
          .innerJoin(
            TABLES.Floors,
            `${TABLES.Floors}.id`,
            `${TABLES.RentalUnits}.floorId`,
          )
          .innerJoin(
            TABLES.Blocks,
            `${TABLES.Blocks}.id`,
            `${TABLES.Floors}.blockId`,
          )
          .where({
            [`${TABLES.UserRoles}.userId`]: booking.userId,
            role: USER_ROLES.RESIDENT,
          })
          .limit(1);

        booking['renatlUnit'] = rentalUnit;
      }

      return res.json({ success: true, data: bookings });
    } catch (error) {
      console.log(
        `Error while fetching amenity booking for admin: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

// api to fetch past bookings(resident) (by userId)
router.get(
  '/bookings/resident',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ query, user }, res) => {
    try {
      const { status = 'ALL' } = query;

      if (!['ALL', ...Object.keys(AMENITY_STATUS)].includes(status)) {
        throw new Error('Invalid status');
      }

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1)
        .select('rentalUnitId');

      if (!userRole?.rentalUnitId)
        throw new Error(`User not associated to rental unit`);

      const bookings = await KNEX(TABLES.BookedAmenity)
        .select([
          `${TABLES.Amenities}.name as amenityId`,
          `${TABLES.Amenities}.type as amenityType`,
          `${TABLES.Amenities}.pricePerSlot as amenityPriceperSlot`,
          `${TABLES.Amenities}.isActive as amenityisActive`,

          `${TABLES.Users}.id as userId`,
          `${TABLES.Users}.email as userEmail`,
          `${TABLES.Users}.mobileNumber as userMobileNumber`,
          `${TABLES.Users}.firstName as userFirstName`,
          `${TABLES.Users}.lastName as userlastName`,
          `${TABLES.Users}.profileImage as userprofileImage`,

          `${TABLES.BookedAmenity}.id as id`,
          `${TABLES.BookedAmenity}.startTime`,
          `${TABLES.BookedAmenity}.endTime`,
          `${TABLES.BookedAmenity}.amountPaid`,
          `${TABLES.BookedAmenity}.status`,
          `${TABLES.BookedAmenity}.slotsBooked`,
        ])
        .innerJoin(
          TABLES.Amenities,
          `${TABLES.Amenities}.id`,
          `${TABLES.BookedAmenity}.amenityId`,
        )
        .innerJoin(
          TABLES.Users,
          `${TABLES.Users}.id`,
          `${TABLES.BookedAmenity}.userId`,
        )
        .where({
          [`${TABLES.BookedAmenity}.rentalUnitId`]: userRole?.rentalUnitId,
        })
        .orderBy(`${TABLES.BookedAmenity}.createdAt`, 'desc')
        .modify((queryBuilder) => {
          if (status === AMENITY_STATUS.BOOKED) {
            queryBuilder.where({ status: AMENITY_STATUS.BOOKED });
          }

          if (status === AMENITY_STATUS.CANCELLED) {
            queryBuilder.where({ status: AMENITY_STATUS.CANCELLED });
          }
        });

      return res.json({ success: true, data: bookings });
    } catch (error) {
      console.log(
        `Error while fetching amenity booking for resident: ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

export default router;
