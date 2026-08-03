/**
 * Admin support inbox queues — separates user messages from bug/incident reports.
 */

const SUPPORT_QUEUES = {
  meddelanden: {
    label: 'Meddelanden',
    types: ['contact', 'feedback', 'language'],
  },
  incidenter: {
    label: 'Incidenter & buggar',
    types: ['bug'],
  },
};

function isValidQueue(queue) {
  return Boolean(queue && Object.prototype.hasOwnProperty.call(SUPPORT_QUEUES, queue));
}

function typesForQueue(queue) {
  if (!isValidQueue(queue)) return null;
  return SUPPORT_QUEUES[queue].types.slice();
}

function labelForQueue(queue) {
  if (!isValidQueue(queue)) return '';
  return SUPPORT_QUEUES[queue].label;
}

module.exports = {
  SUPPORT_QUEUES,
  isValidQueue,
  typesForQueue,
  labelForQueue,
};
