/**
 * NEXORA — connection service-layer smoke test.
 *
 * Exercises the connection state machine, serializer, and validators
 * without touching MongoDB. This script intentionally does NOT claim to
 * be an integration test; it is a static / unit-level confidence check
 * for the pieces that don't require a live database.
 *
 * Run from the `server/` directory:
 *
 *     node scripts/connection.smoke.cjs
 *
 * Exit code: 0 on full pass, 1 on any failure.
 */

const path = require('path');

process.chdir(path.resolve(__dirname, '..'));

const assert = require('assert/strict');

const STATUS = require('../models/Connection').STATUS;
const {
  canonicalPair,
  sendRequest,
  acceptRequest,
  rejectRequest,
  withdrawRequest,
  removeConnection,
  getStatusForCaller,
} = require('../services/connection.service');
const {
  validateUserIdParam,
  validateConnectionIdParam,
} = require('../validators/connection.validator');
const {
  toSafeConnection,
  toSafeConnectionList,
  semanticStatusFor,
} = require('../utils/safeConnection');

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  ok  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`  FAIL ${name}: ${err.message}`);
  }
}

function group(label, fn) {
  console.log(`\n${label}`);
  fn();
}

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439099';
const USER_C = '507f1f77bcf86cd799439033';
const USER_D = '507f1f77bcf86cd799439044';

group('canonicalPair', () => {
  test('orders smaller hex first', () => {
    const [a, b] = canonicalPair(USER_A, USER_B);
    // USER_B hex "507f...9099" is greater than USER_A "507f...9011"
    assert.equal(a, USER_A);
    assert.equal(b, USER_B);
  });
  test('order-independent', () => {
    const [a, b] = canonicalPair(USER_B, USER_A);
    assert.equal(a, USER_A);
    assert.equal(b, USER_B);
  });
});

group('validators', () => {
  test('validateUserIdParam rejects malformed', () => {
    assert.deepEqual(validateUserIdParam({ userId: 'abc' }), {
      userId: 'Invalid user id',
    });
    assert.deepEqual(validateUserIdParam({ userId: '' }), {
      userId: 'Invalid user id',
    });
  });
  test('validateUserIdParam accepts a valid ObjectId', () => {
    assert.deepEqual(validateUserIdParam({ userId: USER_A }), {});
  });
  test('validateConnectionIdParam rejects malformed', () => {
    assert.deepEqual(validateConnectionIdParam({ connectionId: 'not-an-id' }), {
      connectionId: 'Invalid connection id',
    });
  });
  test('validateConnectionIdParam accepts a valid ObjectId', () => {
    assert.deepEqual(
      validateConnectionIdParam({ connectionId: USER_A }),
      {}
    );
  });
});

group('STATUS enum', () => {
  test('contains the four documented states', () => {
    assert.deepEqual(
      Object.values(STATUS).sort(),
      ['accepted', 'pending', 'rejected', 'withdrawn']
    );
  });
});

group('semanticStatusFor', () => {
  test('no connection → none', () => {
    assert.equal(semanticStatusFor(null, USER_A), 'none');
  });
  test('pending + caller is requester → outgoing_pending', () => {
    const conn = {
      status: STATUS.PENDING,
      requester: USER_A,
      recipient: USER_B,
    };
    assert.equal(semanticStatusFor(conn, USER_A), 'outgoing_pending');
  });
  test('pending + caller is recipient → incoming_pending', () => {
    const conn = {
      status: STATUS.PENDING,
      requester: USER_A,
      recipient: USER_B,
    };
    assert.equal(semanticStatusFor(conn, USER_B), 'incoming_pending');
  });
  test('accepted → connected (regardless of role)', () => {
    const conn = {
      status: STATUS.ACCEPTED,
      requester: USER_A,
      recipient: USER_B,
    };
    assert.equal(semanticStatusFor(conn, USER_A), 'connected');
    assert.equal(semanticStatusFor(conn, USER_B), 'connected');
  });
  test('rejected → none for both sides', () => {
    const conn = {
      status: STATUS.REJECTED,
      requester: USER_A,
      recipient: USER_B,
    };
    assert.equal(semanticStatusFor(conn, USER_A), 'none');
    assert.equal(semanticStatusFor(conn, USER_B), 'none');
  });
  test('withdrawn → none for both sides', () => {
    const conn = {
      status: STATUS.WITHDRAWN,
      requester: USER_A,
      recipient: USER_B,
    };
    assert.equal(semanticStatusFor(conn, USER_A), 'none');
    assert.equal(semanticStatusFor(conn, USER_B), 'none');
  });
});

group('safeConnection serializer', () => {
  function buildFakeConn(status = STATUS.PENDING) {
    return {
      id: 'cid',
      status,
      requester: USER_A,
      recipient: USER_B,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }
  function buildFakeUser(id, firstName, lastName) {
    return { _id: id, firstName, lastName };
  }
  function buildFakeProfile(userId, headline, profilePhoto) {
    return { user: userId, headline, profilePhoto };
  }

  test('projects connection + populates requester/recipient', () => {
    const conn = buildFakeConn();
    const map = new Map([
      [
        USER_A,
        {
          user: buildFakeUser(USER_A, 'Alice', 'Anderson'),
          profile: buildFakeProfile(
            USER_A,
            'Senior Engineer at NEXORA',
            'https://example.com/a.jpg'
          ),
        },
      ],
      [
        USER_B,
        {
          user: buildFakeUser(USER_B, 'Bob', 'Barker'),
          profile: buildFakeProfile(
            USER_B,
            'Product Manager',
            'https://example.com/b.jpg'
          ),
        },
      ],
    ]);
    const out = toSafeConnection(conn, map);
    assert.equal(out.id, 'cid');
    // status is intentionally NOT exposed on the wire (see safeConnection.js)
    assert.equal(out.status, undefined);
    assert.deepEqual(out.requester.user, {
      id: USER_A,
      firstName: 'Alice',
      lastName: 'Anderson',
      fullName: 'Alice Anderson',
    });
    assert.equal(out.requester.profile.headline, 'Senior Engineer at NEXORA');
    assert.equal(
      out.requester.profile.profilePhoto,
      'https://example.com/a.jpg'
    );
    assert.equal(out.requester.placeholder, false);
    assert.equal(out.recipient.user.fullName, 'Bob Barker');
    assert.equal(out.recipient.profile.headline, 'Product Manager');
  });

  test('does not expose userA / userB internal pair fields', () => {
    const conn = {
      id: 'cid',
      status: STATUS.PENDING,
      requester: USER_A,
      recipient: USER_B,
      userA: USER_A,
      userB: USER_B,
    };
    const map = new Map();
    const out = toSafeConnection(conn, map);
    assert.equal(out.userA, undefined);
    assert.equal(out.userB, undefined);
  });

  test('handles missing participant with placeholder', () => {
    const conn = buildFakeConn(STATUS.ACCEPTED);
    const map = new Map([
      [USER_A, { user: buildFakeUser(USER_A, 'Alice', 'A'), profile: null }],
      // USER_B intentionally missing
    ]);
    const out = toSafeConnection(conn, map);
    assert.equal(out.requester.placeholder, false);
    assert.equal(out.recipient.placeholder, true);
    assert.equal(out.recipient.user, null);
    assert.equal(out.recipient.profile, null);
  });

  test('list serializer maps every connection', () => {
    const docs = [
      buildFakeConn(STATUS.PENDING),
      buildFakeConn(STATUS.ACCEPTED),
    ];
    const map = new Map([
      [USER_A, { user: buildFakeUser(USER_A, 'A', 'A'), profile: null }],
      [USER_B, { user: buildFakeUser(USER_B, 'B', 'B'), profile: null }],
    ]);
    const out = toSafeConnectionList(docs, map);
    assert.equal(out.length, 2);
    // status is intentionally NOT exposed on the wire
    assert.equal(out[0].status, undefined);
    assert.equal(out[1].status, undefined);
    assert.equal(out[0].id, 'cid');
    assert.equal(out[1].id, 'cid');
  });
});

group('sendRequest — self-connection rejection', () => {
  // To exercise this without a real DB we monkey-patch User.findById to
  // simulate that the target exists. We do NOT exercise the create path
  // here — only the early guard.
  test('rejects when targetId === requesterId before any DB call', async () => {
    // Monkey-patch the User model for this test only.
    const User = require('../models/User');
    const original = User.findById;
    let called = false;
    User.findById = () => {
      called = true;
      return { select: () => Promise.resolve({ _id: USER_A }) };
    };
    try {
      await assert.rejects(
        () => sendRequest(USER_A, USER_A),
        /You cannot send a connection request to yourself/
      );
      // The self-guard fires before any DB call.
      assert.equal(called, false, 'User.findById must not be called');
    } finally {
      User.findById = original;
    }
  });
});

group('state machine — invalid transitions', () => {
  // After Prompt 2 hardening, every transition is a single atomic
  // findOneAndUpdate / findOneAndDelete; the smoke test stubs the
  // relevant Mongoose statics for each scenario.

  function noOp(_filter) {
    // Return null to mean "no doc matched".
    return Promise.resolve(null);
  }

  function stubConnectionStatics(stubs, fn) {
    const Connection = require('../models/Connection');
    const saved = {
      findOneAndUpdate: Connection.findOneAndUpdate,
      findOneAndDelete: Connection.findOneAndDelete,
      findById: Connection.findById,
    };
    if (stubs.findOneAndUpdate !== undefined) {
      Connection.findOneAndUpdate = stubs.findOneAndUpdate;
    }
    if (stubs.findOneAndDelete !== undefined) {
      Connection.findOneAndDelete = stubs.findOneAndDelete;
    }
    if (stubs.findById !== undefined) {
      Connection.findById = stubs.findById;
    }
    try {
      fn();
    } finally {
      Connection.findOneAndUpdate = saved.findOneAndUpdate;
      Connection.findOneAndDelete = saved.findOneAndDelete;
      Connection.findById = saved.findById;
    }
  }

  function fakeConn(status) {
    return {
      _id: 'cid',
      userA: USER_A,
      userB: USER_B,
      requester: USER_A,
      recipient: USER_B,
      status,
    };
  }

  test('accepted → accept: 409 (atomic miss, doc is accepted)', async () => {
    await stubConnectionStatics(
      {
        findOneAndUpdate: () => Promise.resolve(null), // atomic miss
        findById: async () => fakeConn(STATUS.ACCEPTED),
      },
      async () => {
        await assert.rejects(
          () => acceptRequest('cid', USER_B),
          /Only pending connections can perform this action/
        );
      }
    );
  });

  test('accepted → reject: 409', async () => {
    await stubConnectionStatics(
      {
        findOneAndUpdate: () => Promise.resolve(null),
        findById: async () => fakeConn(STATUS.ACCEPTED),
      },
      async () => {
        await assert.rejects(
          () => rejectRequest('cid', USER_B),
          /Only pending connections can perform this action/
        );
      }
    );
  });

  test('accepted → withdraw: 409', async () => {
    await stubConnectionStatics(
      {
        findOneAndUpdate: () => Promise.resolve(null),
        findById: async () => fakeConn(STATUS.ACCEPTED),
      },
      async () => {
        await assert.rejects(
          () => withdrawRequest('cid', USER_A),
          /Only pending connections can perform this action/
        );
      }
    );
  });

  test('rejected → accept: 409', async () => {
    await stubConnectionStatics(
      {
        findOneAndUpdate: () => Promise.resolve(null),
        findById: async () => fakeConn(STATUS.REJECTED),
      },
      async () => {
        await assert.rejects(
          () => acceptRequest('cid', USER_B),
          /Only pending connections can perform this action/
        );
      }
    );
  });

  test('rejected → reject: 409', async () => {
    await stubConnectionStatics(
      {
        findOneAndUpdate: () => Promise.resolve(null),
        findById: async () => fakeConn(STATUS.REJECTED),
      },
      async () => {
        await assert.rejects(
          () => rejectRequest('cid', USER_B),
          /Only pending connections can perform this action/
        );
      }
    );
  });

  test('withdrawn → withdraw: 409', async () => {
    await stubConnectionStatics(
      {
        findOneAndUpdate: () => Promise.resolve(null),
        findById: async () => fakeConn(STATUS.WITHDRAWN),
      },
      async () => {
        await assert.rejects(
          () => withdrawRequest('cid', USER_A),
          /Only pending connections can perform this action/
        );
      }
    );
  });

  test('pending → accept by requester (not recipient): 403', async () => {
    await stubConnectionStatics(
      {
        findOneAndUpdate: () => Promise.resolve(null),
        findById: async () => fakeConn(STATUS.PENDING),
      },
      async () => {
        await assert.rejects(
          () => acceptRequest('cid', USER_A),
          /Only the recipient can perform this action/
        );
      }
    );
  });

  test('pending → withdraw by recipient (not requester): 403', async () => {
    await stubConnectionStatics(
      {
        findOneAndUpdate: () => Promise.resolve(null),
        findById: async () => fakeConn(STATUS.PENDING),
      },
      async () => {
        await assert.rejects(
          () => withdrawRequest('cid', USER_B),
          /Only the requester can perform this action/
        );
      }
    );
  });

  test('accepted → remove by unrelated user: 403', async () => {
    await stubConnectionStatics(
      {
        findOneAndDelete: () => Promise.resolve(null),
        findById: async () => fakeConn(STATUS.ACCEPTED),
      },
      async () => {
        await assert.rejects(
          () => removeConnection('cid', USER_C),
          /You are not part of this connection/
        );
      }
    );
  });

  test('pending → remove: 409 (only accepted can be removed)', async () => {
    await stubConnectionStatics(
      {
        findOneAndDelete: () => Promise.resolve(null),
        findById: async () => fakeConn(STATUS.PENDING),
      },
      async () => {
        await assert.rejects(
          () => removeConnection('cid', USER_A),
          /Only accepted connections can be removed/
        );
      }
    );
  });

  test('atomic accept: hits the atomic update and returns the doc', async () => {
    let filter;
    await stubConnectionStatics(
      {
        findOneAndUpdate: async (f) => {
          filter = f;
          return { ...fakeConn(STATUS.ACCEPTED), status: STATUS.ACCEPTED };
        },
        findById: async () => fakeConn(STATUS.PENDING),
      },
      async () => {
        const out = await acceptRequest('cid', USER_B);
        assert.equal(out.status, STATUS.ACCEPTED);
        assert.equal(filter.status, STATUS.PENDING);
        assert.equal(String(filter.recipient), USER_B);
      }
    );
  });

  test('full lifecycle: pending → accepted → removed', async () => {
    let removedId = null;
    await stubConnectionStatics(
      {
        findOneAndUpdate: async () => fakeConn(STATUS.ACCEPTED),
        findOneAndDelete: async ({ _id }) => {
          removedId = _id;
          return fakeConn(STATUS.ACCEPTED);
        },
        findById: async () => fakeConn(STATUS.PENDING),
      },
      async () => {
        const accepted = await acceptRequest('cid', USER_B);
        assert.equal(accepted.status, STATUS.ACCEPTED);
        const out = await removeConnection('cid', USER_A);
        assert.equal(out.removed, true);
        assert.equal(removedId, 'cid');
      }
    );
  });
});

group('getStatusForCaller — invalid id rejected without DB', () => {
  test('throws on malformed id', async () => {
    await assert.rejects(
      () => getStatusForCaller(USER_A, 'not-an-id'),
      /Invalid user id/
    );
  });
  test('throws on missing id', async () => {
    await assert.rejects(
      () => getStatusForCaller(USER_A, undefined),
      /Invalid user id/
    );
  });
});

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} passed` +
    (failed.length ? `, ${failed.length} failed` : '')
);
process.exit(failed.length ? 1 : 0);
