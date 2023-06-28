import { Router } from 'express';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import {
  REQUEST_VALIDATOR_MODIFICATIONS,
  USER_ROLES,
} from '../../../constants.js';
import validationSchemas from '../utils/validationSchema.js';
import { sanitizeAndValidateRequest } from '../../../utils/sanitize.js';

const router = Router();

router.post(
  '/category',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async ({ body }, res) => {
    try {
      sanitizeAndValidateRequest(body, validationSchemas.createCategory, {
        BEFORE_VALIDATION: {
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { name, image } = body;

      await KNEX(TABLES.EmergencyContactCategories).insert({
        name,
        image,
      });

      return res.json({ success: true, message: 'Category created' });
    } catch (error) {
      console.log(
        `Error while creating emergency contact category - ${error.message}`,
      );

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.get(
  '/category',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      const data = await KNEX(TABLES.EmergencyContactCategories);

      return res.json({ success: true, data });
    } catch (error) {
      console.log(
        `Error while fetching emergency contact category - ${error.message}`,
      );

      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

// api to create contacts
router.post(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.createContact);

      const {
        name,
        image,
        mobileNumber,
        emergencyContactCategoryId,
        societyId,
      } = body;

      // checking user role
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
        })
        .limit(1)
        .select('role', 'societyId');

      if (userRole?.role !== USER_ROLES.SUPER_ADMIN) {
        if (!userRole?.societyId)
          throw new Error('No associated society found');

        if (userRole?.societyId !== societyId)
          throw new Error('Invalid permission for the given society');
      }

      await KNEX(TABLES.EmergencyContacts).insert({
        name,
        image,
        mobileNumber,
        emergencyContactCategoryId,
        societyId,
      });

      return res.json({ success: true, message: 'Contact created' });
    } catch (error) {
      console.log(`Error while creating emergency contact - ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

// api to fetch all contacts
router.get('/all', checkRole([USER_ROLES.SUPER_ADMIN]), async (req, res) => {
  try {
    const data = await KNEX(TABLES.EmergencyContacts)
      .innerJoin(
        TABLES.EmergencyContactCategories,
        `${TABLES.EmergencyContactCategories}.id`,
        `${TABLES.EmergencyContacts}.emergencyContactCategoryId`,
      )
      .innerJoin(
        TABLES.Societies,
        `${TABLES.Societies}.id`,
        `${TABLES.EmergencyContacts}.societyId`,
      )
      .select([
        `${TABLES.EmergencyContacts}.id`,
        `${TABLES.EmergencyContacts}.name`,
        `${TABLES.EmergencyContacts}.image`,
        `${TABLES.EmergencyContacts}.mobileNumber`,
        `${TABLES.Societies}.name as societyName`,
        `${TABLES.EmergencyContactCategories}.name as categoryName`,
        `${TABLES.EmergencyContactCategories}.image as categoryImage`,
      ])
      .orderBy(`${TABLES.Societies}.name`);

    return res.json({ success: true, data });
  } catch (error) {
    console.log(
      `Error while fetching all emergency contact - ${error.message}`,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

// api to fetch contacts by society and grouped by category
router.get('/', async ({ user, query }, res) => {
  try {
    requestValidator(query, validationSchemas.fetchContacts);

    const { societyId } = query;

    // checking user role
    const [userRole] = await KNEX(TABLES.UserRoles)
      .where({
        userId: user.id,
      })
      .limit(1)
      .select('societyId', 'role');

    if (userRole?.role !== USER_ROLES.SUPER_ADMIN) {
      if (!userRole?.societyId) throw new Error('No associated society found');

      if (userRole?.societyId !== societyId)
        throw new Error('Invalid permission for the given society');
    }

    const categories = await KNEX(TABLES.EmergencyContactCategories).select(
      'id',
      'name as categoryName',
      'image as categoryImage',
    );

    for (let index = 0; index < categories.length; index++) {
      const category = categories[index];
      const contacts = await KNEX(TABLES.EmergencyContacts)
        .where({
          societyId,
          emergencyContactCategoryId: category.id,
        })
        .select('name', 'image', 'mobileNumber');

      category['contacts'] = contacts;
    }

    return res.json({ success: true, data: categories });
  } catch (error) {
    console.log(`Error while fetching emergency contacts - ${error.message}`);

    return res.status(500).json({
      success: false,
      message: error.message,
      info: error?.info,
    });
  }
});

router.patch(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async ({ body }, res) => {
    try {
      requestValidator(body, validationSchemas.updateContact);

      const { emergencyContactId, emergencyContactCategoryId } = body;

      const [emergencyContact] = await KNEX(TABLES.EmergencyContacts)
        .where({ id: emergencyContactId })
        .limit(1);

      if (!emergencyContact) throw new Error('No emergency contact found');

      if (emergencyContactCategoryId) {
        const [category] = await KNEX(TABLES.EmergencyContactCategories)
          .where({ id: emergencyContactCategoryId })
          .limit(1);

        if (!category) throw new Error('No emergency contact category found');
      }

      delete body.emergencyContactId;

      await KNEX(TABLES.EmergencyContacts)
        .where({ id: emergencyContactId })
        .update(body);

      return res.json({
        success: true,
        message: 'Contacts updated successfully',
      });
    } catch (error) {
      console.log(`Error while updating emergency contacts - ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

router.delete(
  '/',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async ({ body }, res) => {
    try {
      requestValidator(body, validationSchemas.deleteContact);

      const { emergencyContactId } = body;

      await KNEX(TABLES.EmergencyContacts)
        .where({ id: emergencyContactId })
        .del();

      return res.json({
        success: true,
        message: 'Contacts deleted successfully',
      });
    } catch (error) {
      console.log(`Error while deleting emergency contacts - ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

export default router;
