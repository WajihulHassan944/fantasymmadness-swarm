import { Router } from 'express';
import { agentRegistry } from '../../agents/registry.js';
import { isMongoReady } from '../../db/connection.js';
import {
  cancelJobHandler,
  createJobHandler,
  getJobHandler,
  listJobsHandler,
  retryJobHandler,
} from '../controllers/job.controller.js';
import {
  getArtifactHandler,
  listArtifactsHandler,
  reviewArtifactHandler,
} from '../controllers/artifact.controller.js';
import {
  automationDashboardHandler,
  bulkUpdateAutomationSettingsHandler,
  getAutomationHandler,
  listAutomationLogsHandler,
  listAutomationsHandler,
  resetAutomationSettingHandler,
  triggerAutomationEventHandler,
  updateAutomationSettingHandler,
} from '../controllers/automation.controller.js';
import {
  createCampaignHandler,
  getCampaignHandler,
  listCampaignPacksHandler,
  listCampaignsHandler,
} from '../controllers/campaign.controller.js';

export const internalRouter = Router();

const asyncHandler = (handler: (req: any, res: any, next?: any) => Promise<void>) =>
  (req: any, res: any, next: any) => handler(req, res, next).catch(next);

internalRouter.get('/', (_req, res) => {
  res.json({ ok: true, name: 'FantasyMMAdness Centralized Swarm API', version: '1.0.0' });
});

internalRouter.get('/health', (_req, res) => {
  res.json({ ok: true, mongoReady: isMongoReady(), timestamp: new Date().toISOString() });
});

internalRouter.get('/agents', (_req, res) => {
  res.json({ ok: true, agents: agentRegistry.list() });
});

internalRouter.get('/automations', asyncHandler(listAutomationsHandler));
internalRouter.get('/automations/dashboard', asyncHandler(automationDashboardHandler));
internalRouter.get('/automations/logs', asyncHandler(listAutomationLogsHandler));
internalRouter.post('/automations/settings/bulk', asyncHandler(bulkUpdateAutomationSettingsHandler));
internalRouter.post('/automations/events', asyncHandler(triggerAutomationEventHandler));
internalRouter.get('/automations/:key', asyncHandler(getAutomationHandler));
internalRouter.patch('/automations/:key/settings', asyncHandler(updateAutomationSettingHandler));
internalRouter.post('/automations/:key/reset', asyncHandler(resetAutomationSettingHandler));


internalRouter.get('/campaigns/packs', asyncHandler(listCampaignPacksHandler));
internalRouter.post('/campaigns', asyncHandler(createCampaignHandler));
internalRouter.get('/campaigns', asyncHandler(listCampaignsHandler));
internalRouter.get('/campaigns/:campaignId', asyncHandler(getCampaignHandler));

internalRouter.post('/jobs', asyncHandler(createJobHandler));
internalRouter.get('/jobs', asyncHandler(listJobsHandler));
internalRouter.get('/jobs/:jobId', asyncHandler(getJobHandler));
internalRouter.post('/jobs/:jobId/cancel', asyncHandler(cancelJobHandler));
internalRouter.post('/jobs/:jobId/retry', asyncHandler(retryJobHandler));

internalRouter.get('/artifacts', asyncHandler(listArtifactsHandler));
internalRouter.get('/artifacts/:artifactId', asyncHandler(getArtifactHandler));
internalRouter.post('/artifacts/:artifactId/review', asyncHandler(reviewArtifactHandler));
