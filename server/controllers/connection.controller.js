/**
 * NEXORA — connection controller.
 *
 * Thin HTTP layer. The service owns the state machine; the controller
 * extracts path parameters, calls the service, and shapes the response
 * via ApiResponse. All errors are forwarded to the centralized error
 * middleware.
 */

const ApiResponse = require('../utils/ApiResponse');
const {
  toSafeConnection,
  toSafeConnectionList,
  semanticStatusFor,
} = require('../utils/safeConnection');
const connectionService = require('../services/connection.service');

/**
 * POST /api/v1/connections/:userId/request
 */
async function sendRequest(req, res, next) {
  try {
    const conn = await connectionService.sendRequest(
      req.user.id,
      req.params.userId
    );
    const participantMap = await connectionService.loadParticipantMap([conn]);
    res.status(201).json(
      new ApiResponse(201, 'Connection request sent', {
        connection: toSafeConnection(conn, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/connections/:connectionId/accept
 */
async function accept(req, res, next) {
  try {
    const conn = await connectionService.acceptRequest(
      req.params.connectionId,
      req.user.id
    );
    const participantMap = await connectionService.loadParticipantMap([conn]);
    res.status(200).json(
      new ApiResponse(200, 'Connection accepted', {
        connection: toSafeConnection(conn, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/connections/:connectionId/reject
 */
async function reject(req, res, next) {
  try {
    const conn = await connectionService.rejectRequest(
      req.params.connectionId,
      req.user.id
    );
    const participantMap = await connectionService.loadParticipantMap([conn]);
    res.status(200).json(
      new ApiResponse(200, 'Connection rejected', {
        connection: toSafeConnection(conn, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/connections/:connectionId/withdraw
 */
async function withdraw(req, res, next) {
  try {
    const conn = await connectionService.withdrawRequest(
      req.params.connectionId,
      req.user.id
    );
    const participantMap = await connectionService.loadParticipantMap([conn]);
    res.status(200).json(
      new ApiResponse(200, 'Connection request withdrawn', {
        connection: toSafeConnection(conn, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/connections/:connectionId
 */
async function remove(req, res, next) {
  try {
    const result = await connectionService.removeConnection(
      req.params.connectionId,
      req.user.id
    );
    res.status(200).json(new ApiResponse(200, 'Connection removed', result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/connections/status/:userId
 *
 * Returns a semantic status string the frontend can render directly.
 * Optional `connection` field includes the full safe projection when a
 * relationship exists.
 */
async function getStatus(req, res, next) {
  try {
    const conn = await connectionService.getStatusForCaller(
      req.user.id,
      req.params.userId
    );
    const status = semanticStatusFor(conn, req.user.id);
    if (!conn) {
      return res.status(200).json(
        new ApiResponse(200, 'Connection status retrieved', {
          status,
          targetUserId: req.params.userId,
        })
      );
    }
    const participantMap = await connectionService.loadParticipantMap([conn]);
    return res.status(200).json(
      new ApiResponse(200, 'Connection status retrieved', {
        status,
        targetUserId: req.params.userId,
        connection: toSafeConnection(conn, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/connections
 *
 * Returns the caller's accepted connections.
 */
async function listAccepted(req, res, next) {
  try {
    const docs = await connectionService.listAcceptedForUser(req.user.id);
    const participantMap = await connectionService.loadParticipantMap(docs);
    res.status(200).json(
      new ApiResponse(200, 'Connections retrieved', {
        connections: toSafeConnectionList(docs, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/connections/incoming
 *
 * Returns incoming pending requests targeted at the caller.
 */
async function listIncoming(req, res, next) {
  try {
    const docs = await connectionService.listIncomingPendingForUser(
      req.user.id
    );
    const participantMap = await connectionService.loadParticipantMap(docs);
    res.status(200).json(
      new ApiResponse(200, 'Incoming requests retrieved', {
        connections: toSafeConnectionList(docs, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/connections/outgoing
 *
 * Returns outgoing pending requests the caller has sent.
 */
async function listOutgoing(req, res, next) {
  try {
    const docs = await connectionService.listOutgoingPendingForUser(
      req.user.id
    );
    const participantMap = await connectionService.loadParticipantMap(docs);
    res.status(200).json(
      new ApiResponse(200, 'Outgoing requests retrieved', {
        connections: toSafeConnectionList(docs, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendRequest,
  accept,
  reject,
  withdraw,
  remove,
  getStatus,
  listAccepted,
  listIncoming,
  listOutgoing,
};
