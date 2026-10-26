const { Worker } = require('bullmq');
const { connection } = require('../queues/videoQueue');
const { getQueue } = require('../queues/queueManager');
const notificationEmails = require('../services/notificationEmailService');

/**
 * Sends notification emails and runs the lecture-reminder sweep. The sweep is
 * a BullMQ job scheduler, so it runs once per minute across all workers.
 */
const worker = new Worker('email', async (job) => {
  if (job.data.kind === 'notification') {
    return notificationEmails.deliver(job.data.notificationId);
  }
  if (job.data.kind === 'lecture-reminders') {
    return notificationEmails.sendLectureReminders();
  }
  return 'unknown-job';
}, { connection, concurrency: 5 });

worker.on('failed', (job, err) => {
  console.error(`[email] job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
});
worker.on('error', (err) => console.error('[email worker]', err.message));

getQueue('email')
  .upsertJobScheduler('lecture-reminders', { every: 60 * 1000 }, { name: 'email', data: { kind: 'lecture-reminders' }, opts: { removeOnComplete: 50, removeOnFail: 50 } })
  .catch((err) => console.error('[email] could not schedule lecture reminders:', err.message));

console.log('Email worker started.');

module.exports = worker;
