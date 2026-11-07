const { Worker } = require('bullmq');
const { buildConnection } = require('../queues/connection');
const { QUEUES, getQueue } = require('../queues');
const notificationEmails = require('../services/notificationEmailService');

/**
 * Sends notification emails and runs the lecture-reminder sweep. The sweep is a
 * BullMQ job scheduler, so it runs once a minute no matter how many workers run.
 */
const start = () => {
  const worker = new Worker(QUEUES.EMAIL, async (job) => {
    if (job.data.kind === 'notification') return notificationEmails.deliver(job.data.notificationId);
    if (job.data.kind === 'lecture-reminders') return notificationEmails.sendLectureReminders();
    return 'unknown-job';
  }, { connection: buildConnection(), concurrency: 5 });

  worker.on('failed', (job, err) => console.error(`[worker:email] job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`));
  worker.on('error', (err) => console.error('[worker:email]', err.message));

  getQueue(QUEUES.EMAIL)
    .upsertJobScheduler('lecture-reminders', { every: 60 * 1000 }, { name: QUEUES.EMAIL, data: { kind: 'lecture-reminders' }, opts: { removeOnComplete: 20, removeOnFail: 50 } })
    .catch((err) => console.error('[worker:email] could not schedule lecture reminders:', err.message));

  console.log('[worker:email] started.');
  return worker;
};

module.exports = { start };
