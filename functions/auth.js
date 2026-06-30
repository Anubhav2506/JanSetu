const admin = require('firebase-admin');

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function requireOfficer(req) {
  if (req.internal === true) {
    return { uid: 'system', role: 'system' };
  }

  const token = getBearerToken(req);
  if (!token) {
    const err = new Error('Officer login required');
    err.status = 401;
    throw err;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  if (decoded.role === 'officer') {
    return decoded;
  }

  const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
  if (userDoc.exists && userDoc.data().role === 'officer') {
    return { ...decoded, role: 'officer' };
  }

  const err = new Error('Officer access required');
  err.status = 403;
  throw err;
}

module.exports = { requireOfficer };
