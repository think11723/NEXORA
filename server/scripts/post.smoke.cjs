/**
 * NEXORA — post service-level smoke test.
 *
 * Exercises the validators, the safe serializer, and the service
 * signature — including the atomic ownership-aware mutations and the
 * pagination contract. The Post model + connection + user + profile
 * models are stubbed with mocks so the script can run without a live
 * MongoDB. (Live integration tests would require a real DB; this
 * environment does not provide one.)
 *
 * Run from the `server/` directory:
 *
 *     node scripts/post.smoke.cjs
 *
 * Exit code: 0 on full pass, 1 on any failure.
 */

const path = require('path');

process.chdir(path.resolve(__dirname, '..'));

const assert = require('assert/strict');

const {
  validatePostCreatePayload,
  validatePostUpdatePayload,
  validatePostIdParam,
  validateUserIdParam,
  validatePaginationQuery,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} = require('../validators/post.validator');
const { toSafePost, toSafePostList, POST_FIELDS } = require(
  '../utils/safePost'
);
const postService = require('../services/post.service');
const ApiError = require('../utils/ApiError');
const Post = require('../models/Post');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Connection = require('../models/Connection');

const results = [];
function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r
        .then(() => results.push({ name, ok: true }))
        .catch((e) => {
          results.push({ name, ok: false, error: e.message });
        });
    }
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
  }
}

function group(label, fn) {
  console.log(`\n${label}`);
  return fn();
}

function fakePost(overrides = {}) {
  return {
    _id: '60f0000000000000000000aa',
    author: '60f0000000000000000000a1',
    content: 'hello world',
    visibility: 'public',
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    toJSON() {
      return {
        id: this._id.toString ? this._id.toString() : this._id,
        author: this.author,
        content: this.content,
        visibility: this.visibility,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    },
    ...overrides,
  };
}

function fakeUser(id, firstName, lastName) {
  return {
    _id: id,
    firstName,
    lastName,
    toJSON() {
      return {
        _id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
      };
    },
  };
}

function fakeProfile(userId, headline, profilePhoto) {
  return {
    user: userId,
    headline,
    profilePhoto,
    toJSON() {
      return {
        user: this.user,
        headline: this.headline,
        profilePhoto: this.profilePhoto,
      };
    },
  };
}

const USER_A = '60f0000000000000000000a1';
const USER_B = '60f0000000000000000000a2';
const USER_C = '60f0000000000000000000a3';

// --------------------------------------------------------------------------
// Validators
// --------------------------------------------------------------------------

group('validators', () => {
  test('create payload: rejects missing content', () => {
    const errs = validatePostCreatePayload({});
    assert.ok(errs.content, 'should report a content error');
  });

  test('create payload: rejects empty string', () => {
    const errs = validatePostCreatePayload({ content: '' });
    assert.ok(errs.content, 'empty string should be rejected');
  });

  test('create payload: rejects whitespace-only', () => {
    const errs = validatePostCreatePayload({ content: '   \n\t  ' });
    assert.ok(errs.content, 'whitespace-only should be rejected');
  });

  test('create payload: rejects non-string content', () => {
    const errs = validatePostCreatePayload({ content: 12345 });
    assert.ok(errs.content, 'non-string should be rejected');
  });

  test('create payload: rejects content longer than MAX_CONTENT_LENGTH', () => {
    const { MAX_CONTENT_LENGTH } = Post;
    const long = 'x'.repeat(MAX_CONTENT_LENGTH + 1);
    const errs = validatePostCreatePayload({ content: long });
    assert.ok(errs.content, 'long content should be rejected');
    assert.match(errs.content, /at most/);
  });

  test('create payload: accepts trimmed content at boundary', () => {
    const { MAX_CONTENT_LENGTH } = Post;
    const exact = 'x'.repeat(MAX_CONTENT_LENGTH);
    const errs = validatePostCreatePayload({ content: exact });
    assert.deepEqual(errs, {});
  });

  test('create payload: accepts padded content and trims semantically', () => {
    const errs = validatePostCreatePayload({ content: '   hello   ' });
    assert.deepEqual(errs, {});
  });

  test('update payload: same rules as create', () => {
    const errs = validatePostUpdatePayload({});
    assert.ok(errs.content);
  });

  test('postId param: rejects malformed', () => {
    const errs = validatePostIdParam({ postId: 'abc' });
    assert.deepEqual(errs, { postId: 'Invalid post id' });
  });

  test('postId param: accepts real ObjectId', () => {
    const errs = validatePostIdParam({ postId: '60f0000000000000000000aa' });
    assert.deepEqual(errs, {});
  });

  test('userId param: rejects malformed', () => {
    const errs = validateUserIdParam({ userId: 'abc' });
    assert.deepEqual(errs, { userId: 'Invalid user id' });
  });

  test('userId param: accepts real ObjectId', () => {
    const errs = validateUserIdParam({ userId: USER_A });
    assert.deepEqual(errs, {});
  });

  test('pagination: defaults when no query', () => {
    const { errors, values } = validatePaginationQuery({});
    assert.deepEqual(errors, {});
    assert.equal(values.page, DEFAULT_PAGE);
    assert.equal(values.limit, DEFAULT_LIMIT);
  });

  test('pagination: rejects negative page', () => {
    const { errors } = validatePaginationQuery({ page: '-1' });
    assert.ok(errors.page);
  });

  test('pagination: clamps valid limit to MAX', () => {
    const { errors, values } = validatePaginationQuery({ limit: '100' });
    assert.deepEqual(errors, {});
    assert.equal(values.limit, MAX_LIMIT);
  });

  test('pagination: rejects negative limit', () => {
    const { errors } = validatePaginationQuery({ limit: '-1' });
    assert.ok(errors.limit);
  });

  test('pagination: clamps out-of-range limit silently', () => {
    // The brief allows silent clamping; only malformed input is rejected.
    const { errors, values } = validatePaginationQuery({ limit: '500' });
    assert.deepEqual(errors, {});
    assert.equal(values.limit, MAX_LIMIT);
  });
});

// --------------------------------------------------------------------------
// Safe serializer
// --------------------------------------------------------------------------

group('safePost serializer', () => {
  test('projects a single post with full author block', () => {
    const post = fakePost();
    const map = new Map([
      [
        USER_A,
        {
          user: fakeUser(USER_A, 'Alice', 'Anderson'),
          profile: fakeProfile(USER_A, 'Senior Engineer', null),
        },
      ],
    ]);
    const safe = toSafePost(post, map);
    assert.equal(safe.id, '60f0000000000000000000aa');
    assert.equal(safe.author.user.id, USER_A);
    assert.equal(safe.author.user.fullName, 'Alice Anderson');
    assert.equal(safe.author.profile.headline, 'Senior Engineer');
    assert.equal(safe.author.placeholder, false);
    assert.equal(safe.content, 'hello world');
    assert.equal(safe.visibility, 'public');
    assert.ok(safe.createdAt instanceof Date || typeof safe.createdAt === 'string');
  });

  test('drops raw author ObjectId, exposes author.user.id', () => {
    const post = fakePost();
    const map = new Map();
    const safe = toSafePost(post, map);
    // Author block exists, user is null (placeholder).
    assert.equal(safe.author.user, null);
    assert.equal(safe.author.placeholder, true);
  });

  test('placeholder when author is missing', () => {
    const post = fakePost();
    const map = new Map(); // USER_A not present
    const safe = toSafePost(post, map);
    assert.equal(safe.author.user, null);
    assert.equal(safe.author.profile, null);
    assert.equal(safe.author.placeholder, true);
  });

  test('does not leak sensitive User fields', () => {
    const post = fakePost();
    // Forge a user doc with forbidden fields.
    const sneakyUser = {
      _id: USER_A,
      firstName: 'A',
      lastName: 'B',
      password: 'SECRET',
      role: 'admin',
      isActive: true,
      email: 'a@b.com',
      toJSON() {
        return {
          _id: this._id,
          firstName: this.firstName,
          lastName: this.lastName,
          password: this.password,
          role: this.role,
          isActive: this.isActive,
          email: this.email,
        };
      },
    };
    const map = new Map([[USER_A, { user: sneakyUser, profile: null }]]);
    const safe = toSafePost(post, map);
    assert.equal(safe.author.user.password, undefined);
    assert.equal(safe.author.user.role, undefined);
    assert.equal(safe.author.user.isActive, undefined);
    assert.equal(safe.author.user.email, undefined);
  });

  test('does not leak sensitive Profile fields', () => {
    const post = fakePost();
    const sneakyProfile = {
      user: USER_A,
      headline: 'h',
      profilePhoto: 'p',
      about: 'SECRET',
      coverPhoto: 'c',
      industry: 'i',
      toJSON() {
        return {
          user: this.user,
          headline: this.headline,
          profilePhoto: this.profilePhoto,
          about: this.about,
          coverPhoto: this.coverPhoto,
          industry: this.industry,
        };
      },
    };
    const map = new Map([
      [USER_A, { user: fakeUser(USER_A, 'A', 'B'), profile: sneakyProfile }],
    ]);
    const safe = toSafePost(post, map);
    assert.equal(safe.author.profile.about, undefined);
    assert.equal(safe.author.profile.coverPhoto, undefined);
    assert.equal(safe.author.profile.industry, undefined);
  });

  test('list serializer maps every post', () => {
    const posts = [fakePost({ _id: '60f0000000000000000000aa' }), fakePost({ _id: '60f0000000000000000000bb' })];
    const map = new Map();
    const out = toSafePostList(posts, map);
    assert.equal(out.length, 2);
    assert.equal(out[0].id, '60f0000000000000000000aa');
    assert.equal(out[1].id, '60f0000000000000000000bb');
  });

  test('POST_FIELDS allowlist excludes author raw ObjectId leak', () => {
    assert.ok(POST_FIELDS.includes('id'));
    assert.ok(POST_FIELDS.includes('content'));
    assert.ok(POST_FIELDS.includes('visibility'));
    assert.ok(POST_FIELDS.includes('createdAt'));
    assert.ok(POST_FIELDS.includes('updatedAt'));
  });
});

// --------------------------------------------------------------------------
// Service: createPost
// --------------------------------------------------------------------------

group('service.createPost', () => {
  function withPostCreateStub(impl, fn) {
    const orig = Post.create;
    Post.create = (...args) => impl(...args);
    return Promise.resolve(fn()).finally(() => {
      Post.create = orig;
    });
  }

  test('rejects empty content with 400', async () => {
    await withPostCreateStub(async () => fakePost(), async () => {
      await assert.rejects(
        () => postService.createPost(USER_A, { content: '' }),
        /Content cannot be empty/
      );
    });
  });

  test('rejects whitespace-only content with 400', async () => {
    await withPostCreateStub(async () => fakePost(), async () => {
      await assert.rejects(
        () => postService.createPost(USER_A, { content: '   \n   ' }),
        /Content cannot be empty/
      );
    });
  });

  test('rejects non-string content with 400', async () => {
    await withPostCreateStub(async () => fakePost(), async () => {
      await assert.rejects(
        () => postService.createPost(USER_A, { content: 12345 }),
        /Content cannot be empty/
      );
    });
  });

  test('rejects content longer than MAX_CONTENT_LENGTH', async () => {
    const { MAX_CONTENT_LENGTH } = Post;
    await withPostCreateStub(async () => fakePost(), async () => {
      await assert.rejects(
        () =>
          postService.createPost(USER_A, {
            content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
          }),
        /Content must be at most/
      );
    });
  });

  test('accepts valid content and returns the post', async () => {
    let captured;
    await withPostCreateStub(async (data) => {
      captured = data;
      return fakePost({ content: 'hi', author: USER_A });
    }, async () => {
      const p = await postService.createPost(USER_A, { content: 'hi' });
      assert.equal(captured.author, USER_A);
      assert.equal(captured.content, 'hi');
      assert.equal(p.author, USER_A);
    });
  });

  test('does not accept author from the body (always uses req.user.id)', async () => {
    let captured;
    await withPostCreateStub(async (data) => {
      captured = data;
      return fakePost();
    }, async () => {
      await postService.createPost(USER_A, {
        content: 'hi',
        author: USER_C,
      });
      assert.equal(captured.author, USER_A, 'author must come from auth id');
    });
  });
});

// --------------------------------------------------------------------------
// Service: updatePostOwnedBy / deletePostOwnedBy
// --------------------------------------------------------------------------

group('service.updatePostOwnedBy', () => {
  function withFindOneAndUpdate(impl, fn) {
    const orig = Post.findOneAndUpdate;
    Post.findOneAndUpdate = (...args) => impl(...args);
    return Promise.resolve(fn()).finally(() => {
      Post.findOneAndUpdate = orig;
    });
  }

  test('atomic update: filter includes author = callerId', async () => {
    let captured;
    await withFindOneAndUpdate(async (filter, update, opts) => {
      captured = { filter, update, opts };
      return fakePost();
    }, async () => {
      await postService.updatePostOwnedBy(
        '60f0000000000000000000aa',
        USER_A,
        { content: 'edit' }
      );
      assert.equal(captured.filter.author, USER_A);
      assert.equal(captured.filter._id, '60f0000000000000000000aa');
    });
  });

  test('rejects empty content', async () => {
    await withFindOneAndUpdate(async () => fakePost(), async () => {
      await assert.rejects(
        () =>
          postService.updatePostOwnedBy('60f0000000000000000000aa', USER_A, {
            content: '',
          }),
        /Content cannot be empty/
      );
    });
  });

  test('returns null when no document matches (caller disambiguates)', async () => {
    await withFindOneAndUpdate(async () => null, async () => {
      const r = await postService.updatePostOwnedBy(
        '60f0000000000000000000aa',
        USER_A,
        { content: 'edit' }
      );
      assert.equal(r, null);
    });
  });
});

group('service.deletePostOwnedBy', () => {
  function withFindOneAndDelete(impl, fn) {
    const orig = Post.findOneAndDelete;
    Post.findOneAndDelete = (...args) => impl(...args);
    return Promise.resolve(fn()).finally(() => {
      Post.findOneAndDelete = orig;
    });
  }

  test('atomic delete: filter includes author = callerId', async () => {
    let captured;
    await withFindOneAndDelete(async (filter) => {
      captured = filter;
      return fakePost();
    }, async () => {
      await postService.deletePostOwnedBy(
        '60f0000000000000000000aa',
        USER_A
      );
      assert.equal(captured.author, USER_A);
      assert.equal(captured._id, '60f0000000000000000000aa');
    });
  });

  test('returns null when no document matches', async () => {
    await withFindOneAndDelete(async () => null, async () => {
      const r = await postService.deletePostOwnedBy(
        '60f0000000000000000000aa',
        USER_A
      );
      assert.equal(r, null);
    });
  });
});

// --------------------------------------------------------------------------
// Service: listPostsByAuthor + assertUserExists
// --------------------------------------------------------------------------

group('service.listPostsByAuthor', () => {
  function withFindSortLimit(impl, fn) {
    const orig = Post.find;
    Post.find = (...args) => {
      const q = impl(...args);
      // Mimic Mongoose chainable query.
      return Object.assign(q, {
        sort: () => Object.assign(q, {
          skip: () => Object.assign(q, {
            limit: () => q,
          }),
        }),
        skip: () => Object.assign(q, {
          limit: () => q,
        }),
        limit: () => q,
      });
    };
    return Promise.resolve(fn()).finally(() => {
      Post.find = orig;
    });
  }

  test('passes author filter and pagination to Post.find', async () => {
    let captured;
    await withFindSortLimit(async (filter) => {
      captured = filter;
      // Return a Promise that resolves to [docs, total] via Promise.all
      return Promise.all([
        Promise.resolve([fakePost()]),
        Promise.resolve(1),
      ]);
    }, async () => {
      await postService.listPostsByAuthor(USER_A, { page: 1, limit: 20 });
      assert.equal(captured.author, USER_A);
    });
  });

  test('pagination metadata is correct', async () => {
    await withFindSortLimit(async () =>
      Promise.all([Promise.resolve([fakePost()]), Promise.resolve(45)])
    , async () => {
      const result = await postService.listPostsByAuthor(USER_A, {
        page: 2,
        limit: 20,
      });
      assert.equal(result.pagination.total, 45);
      assert.equal(result.pagination.totalPages, 3);
      assert.equal(result.pagination.hasNextPage, true);
      assert.equal(result.pagination.hasPreviousPage, true);
    });
  });

  test('pagination: empty list returns total 0 and no pages', async () => {
    await withFindSortLimit(async () =>
      Promise.all([Promise.resolve([]), Promise.resolve(0)])
    , async () => {
      const result = await postService.listPostsByAuthor(USER_A, {
        page: 1,
        limit: 20,
      });
      assert.equal(result.pagination.total, 0);
      assert.equal(result.pagination.totalPages, 0);
      assert.equal(result.pagination.hasNextPage, false);
      assert.equal(result.pagination.hasPreviousPage, false);
    });
  });
});

group('service.assertUserExists', () => {
  test('throws 404 when user is missing', async () => {
    const orig = User.findById;
    User.findById = () => ({
      select: () => Promise.resolve(null),
    });
    try {
      await assert.rejects(
        () => postService.assertUserExists(USER_A),
        /User not found/
      );
    } finally {
      User.findById = orig;
    }
  });

  test('resolves when user exists', async () => {
    const orig = User.findById;
    User.findById = () => ({
      select: () => Promise.resolve({ _id: USER_A }),
    });
    try {
      await postService.assertUserExists(USER_A);
    } finally {
      User.findById = orig;
    }
  });
});

// --------------------------------------------------------------------------
// Service: feed
// --------------------------------------------------------------------------

group('service.getFeedForUser', () => {
  function withFindChain(impl, fn) {
    const orig = Post.find;
    Post.find = (...args) => {
      const q = impl(...args);
      return Object.assign(q, {
        sort: () => Object.assign(q, {
          skip: () => Object.assign(q, { limit: () => q }),
        }),
        skip: () => Object.assign(q, { limit: () => q }),
        limit: () => q,
      });
    };
    return Promise.resolve(fn()).finally(() => {
      Post.find = orig;
    });
  }

  function withFindConnection(impl, fn) {
    const orig = Connection.find;
    Connection.find = (...args) => {
      const q = impl(...args);
      return Object.assign(q, { select: () => q });
    };
    return Promise.resolve(fn()).finally(() => {
      Connection.find = orig;
    });
  }

  test('feed includes current user and all accepted connection partners', async () => {
    const connections = [
      { userA: USER_A, userB: USER_B },
      { userA: USER_A, userB: USER_C },
    ];
    let capturedAuthors;
    await withFindConnection(async () => connections, async () => {
      await withFindChain(async (filter) => {
        capturedAuthors = filter.author.$in;
        return Promise.all([Promise.resolve([]), Promise.resolve(0)]);
      }, async () => {
        await postService.getFeedForUser(USER_A, { page: 1, limit: 20 });
      });
    });
    assert.ok(capturedAuthors.includes(USER_A));
    assert.ok(capturedAuthors.includes(USER_B));
    assert.ok(capturedAuthors.includes(USER_C));
  });

  test('feed excludes pending connections (only accepted)', async () => {
    // Service should filter on status='accepted'. Verify the filter arg.
    let capturedFilter;
    await withFindConnection(async (filter) => {
      capturedFilter = filter;
      return [];
    }, async () => {
      await withFindChain(async () => Promise.all([Promise.resolve([]), Promise.resolve(0)]), async () => {
        await postService.getFeedForUser(USER_A, { page: 1, limit: 20 });
      });
    });
    assert.equal(capturedFilter.status, 'accepted');
    assert.ok(capturedFilter.$or, 'must use $or to match either pair side');
  });

  test('feed excludes rejected / withdrawn connections', async () => {
    // Same filter check: only status='accepted' is queried, so rejected/
    // withdrawn rows never feed in.
    let capturedFilter;
    await withFindConnection(async (filter) => {
      capturedFilter = filter;
      return [];
    }, async () => {
      await withFindChain(async () => Promise.all([Promise.resolve([]), Promise.resolve(0)]), async () => {
        await postService.getFeedForUser(USER_A, { page: 1, limit: 20 });
      });
    });
    assert.equal(capturedFilter.status, 'accepted');
  });

  test('feed current user always included even with no connections', async () => {
    let capturedAuthors;
    await withFindConnection(async () => [], async () => {
      await withFindChain(async (filter) => {
        capturedAuthors = filter.author.$in;
        return Promise.all([Promise.resolve([]), Promise.resolve(0)]);
      }, async () => {
        await postService.getFeedForUser(USER_A, { page: 1, limit: 20 });
      });
    });
    assert.deepEqual(capturedAuthors, [USER_A]);
  });

  test('feed query: no N+1 — uses ONE post query', async () => {
    let postQueryCalls = 0;
    await withFindConnection(async () => [], async () => {
      await withFindChain(async () => {
        postQueryCalls++;
        return Promise.all([Promise.resolve([]), Promise.resolve(0)]);
      }, async () => {
        await postService.getFeedForUser(USER_A, { page: 1, limit: 20 });
      });
    });
    assert.equal(postQueryCalls, 1, 'feed must use exactly one Post.find call');
  });
});

// --------------------------------------------------------------------------
// Service: loadParticipantMap
// --------------------------------------------------------------------------

group('service.loadParticipantMap', () => {
  test('batches ONE User + ONE Profile query for many posts', async () => {
    const posts = [
      fakePost({ author: USER_A }),
      fakePost({ author: USER_B }),
      fakePost({ author: USER_C }),
    ];
    let userCalls = 0;
    let profileCalls = 0;
    const origUser = User.find;
    const origProfile = Profile.find;
    User.find = () => {
      userCalls++;
      return { select: () => Promise.resolve([]) };
    };
    Profile.find = () => {
      profileCalls++;
      return { select: () => Promise.resolve([]) };
    };
    try {
      await postService.loadParticipantMap(posts);
      assert.equal(userCalls, 1);
      assert.equal(profileCalls, 1);
    } finally {
      User.find = origUser;
      Profile.find = origProfile;
    }
  });

  test('returns empty Map for empty posts array', async () => {
    const m = await postService.loadParticipantMap([]);
    assert.ok(m instanceof Map);
    assert.equal(m.size, 0);
  });

  test('missing-author safety: missing user surfaces as null', async () => {
    const posts = [fakePost({ author: USER_A })];
    const origUser = User.find;
    const origProfile = Profile.find;
    User.find = () => ({ select: () => Promise.resolve([]) });
    Profile.find = () => ({ select: () => Promise.resolve([]) });
    try {
      const map = await postService.loadParticipantMap(posts);
      const entry = map.get(USER_A);
      assert.equal(entry.user, null);
      assert.equal(entry.profile, null);
    } finally {
      User.find = origUser;
      Profile.find = origProfile;
    }
  });
});

// --------------------------------------------------------------------------
// Service: ApiError shape
// --------------------------------------------------------------------------

group('service ApiError usage', () => {
  test('createPost with non-string body throws ApiError.badRequest', async () => {
    const orig = Post.create;
    Post.create = () => fakePost();
    try {
      await assert.rejects(
        () => postService.createPost(USER_A, { content: 99 }),
        (err) => err.statusCode === 400 && err.message.includes('empty')
      );
    } finally {
      Post.create = orig;
    }
  });
});

// --------------------------------------------------------------------------
// Run
// --------------------------------------------------------------------------

(async () => {
  // Wait a tick for all the async tests to resolve.
  await new Promise((resolve) => setTimeout(resolve, 10));
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} passed` +
      (failed.length ? `, ${failed.length} failed` : '')
  );
  for (const f of failed) {
    console.log(`  FAIL ${f.name}: ${f.error}`);
  }
  process.exit(failed.length ? 1 : 0);
})();
