/**
 * Admin Extended Routes
 * Routes for new admin features: Support, CMS, Map, Inventory Insights
 */

import express from 'express';
import * as adminExtendedController from './admin-extended.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { checkRole } from '../../middlewares/roleCheck.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(checkRole([1])); // Only System Admin (roleId: 1)

// Support & Ticketing Routes
router.get('/tickets', adminExtendedController.getAllTickets);
router.patch('/tickets/:id', adminExtendedController.updateTicket);

// Emergency Map Routes
router.get('/sos-requests', adminExtendedController.getSOSRequests);
router.get('/pharmacies', adminExtendedController.getPharmacyLocations);

// Inventory Insights Routes
router.get('/inventory/insights', adminExtendedController.getInventoryInsights);
router.post('/inventory/restock-alert', adminExtendedController.sendRestockAlert);

// Health Tips CMS Routes
router.get('/health-tips', adminExtendedController.getHealthTips);
router.post('/health-tips', adminExtendedController.createHealthTip);
router.put('/health-tips/:id', adminExtendedController.updateHealthTip);
router.patch('/health-tips/:id', adminExtendedController.updateHealthTip);
router.delete('/health-tips/:id', adminExtendedController.deleteHealthTip);

// Announcements CMS Routes
router.get('/announcements', adminExtendedController.getAnnouncements);
router.post('/announcements', adminExtendedController.createAnnouncement);
router.put('/announcements/:id', adminExtendedController.updateAnnouncement);
router.patch('/announcements/:id', adminExtendedController.updateAnnouncement);
router.delete('/announcements/:id', adminExtendedController.deleteAnnouncement);

export default router;
