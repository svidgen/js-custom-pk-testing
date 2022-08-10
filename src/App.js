import { useEffect } from 'react';
import QUnit from 'qunit';
import awsconfig from './aws-exports';
import 'qunit/qunit/qunit.css';

import { Amplify, API, DataStore } from 'aws-amplify';
import { BasicModel, Post, Comment } from './models';
import * as mutations from './graphql/mutations';

Amplify.configure(awsconfig);

const makeID = () => crypto.randomUUID();

const waitForObserve = ({
  model,
  predicate = undefined,
  count = 1,
  timeout = 5000
}) => new Promise((resolve, reject) => {
  let timer;
  const events = [];

  const subscription = DataStore.observe(model, predicate).subscribe(event => {
    events.push(event);
    if (events.length === count) {
      subscription.unsubscribe();
      clearTimeout(timer);
      resolve(events);
    }
  });

  timer = setTimeout(() => {
    subscription.unsubscribe();
    reject("observe() timed out");
  }, timeout);
});

const waitForSnapshots = ({
  model,
  predicate = undefined,
  time = 3000
}) => new Promise(resolve => {
  let timer;
  const snapshots = [];

  const subscription = DataStore.observeQuery(model, predicate).subscribe(({items}) => {
    snapshots.push(items);
  });

  timer = setTimeout(() => {
    subscription.unsubscribe();
    resolve(snapshots);
  }, time);
});

(async () => {

  await DataStore.clear();
  await new Promise(unsleep => setTimeout(unsleep, 3000));

  QUnit.start();

  QUnit.module("Sanity checks", () => {
    QUnit.test("assert.test name is accessible", assert => {
      assert.equal(assert.test.testName, "assert.test name is accessible")
    });
  })
      
  QUnit.module("Basic", () => {
  
    QUnit.testStart(async () => {
    });
  
    QUnit.testDone(async () => {
      // await DataStore.clear();
    });
  
    QUnit.module("Save", () => {
  
      QUnit.test("Can save a basic model", async assert => {
        const saved = await DataStore.save(new BasicModel({
          body: assert.test.testName
        }))
        assert.ok(saved, "return value from save() should be non-nullish");
        assert.ok(saved.id, "return value from save() should have an id");
      });
  
      QUnit.test("can save a post (HAS_MANY parent) with an ID", async assert => {
        const post = await DataStore.save(new Post({
          postId: makeID(),
          title: assert.test.testName
        }));
    
        assert.ok(post, "return value from save() should be non-nullish");
        assert.ok(post.postId, "return value from save() should have an ID");
      })
  
      QUnit.test("can create a comment with an ID", async assert => {
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: assert.test.testName
        }))
        assert.ok(comment, "return value from save() should be non-nullish");
        assert.ok(comment.commentId, "return value from save() should have an ID");
      });
    });
  
    QUnit.module("Query", () => {
      QUnit.test("can retrieve a created post by PK", async assert => {
        const saved = await DataStore.save(new Post({
          postId: makeID(),
          title: assert.test.testName
        }));
    
        const retrieved = await DataStore.query(Post, saved.postId);
    
        assert.equal(retrieved.postId, saved.postId);
        assert.equal(retrieved.title, saved.title);
      });
  
      QUnit.test("can retrieve a created post by PK predicate", async assert => {
        const saved = await DataStore.save(new Post({
          postId: makeID(),
          title: assert.test.testName
        }));
    
        const retrieved = (await DataStore.query(Post, p => p.postId("eq", saved.postId))).pop();
    
        assert.equal(retrieved.postId, saved.postId);
        assert.equal(retrieved.title, saved.title);
      });
  
      QUnit.test("can retrieve a created comment by PK", async assert => {
        const saved = await DataStore.save(new Comment({
          commentId: makeID(),
          content: assert.test.testName,
        }));
    
        const retrieved = await DataStore.query(Comment, saved.commentId);
        assert.equal(retrieved.commentId, saved.commentId);
        assert.equal(retrieved.content, saved.content);
      });
  
      QUnit.test("can retrieve a created comment by PK predicate", async assert => {
        const saved = await DataStore.save(new Comment({
          commentId: makeID(),
          content: assert.test.testName,
        }));
    
        const retrieved = (await DataStore.query(Comment, c => c.commentId("eq", saved.commentId))).pop();
  
        assert.equal(retrieved.commentId, saved.commentId);
        assert.equal(retrieved.content, saved.content);
      });
  
      QUnit.test("can retrieve all posts", async assert => {
        const postCountToCreate = 5;
  
        const isolationId = makeID();
  
        for (let i = 0; i < postCountToCreate; i++) {
          await DataStore.save(new Post({
            postId: makeID(),
            title: `${assert.test.testName} - ${isolationId} - ${i}`
          }));
        }
  
        const retrieved = (await DataStore.query(Post)).filter(
          p => p.title.startsWith(`${assert.test.testName} - ${isolationId}`)
        );
  
        assert.equal(retrieved.length, postCountToCreate);
      })
    });
  
    QUnit.module("Update", () => {
  
      QUnit.test("can update basic model (sanity check)", async assert => {
        const saved = await DataStore.save(new BasicModel({
          body: assert.test.testName
        }));
    
    
        const retrieved = await DataStore.query(BasicModel, saved.id);
        const updated = await DataStore.save(BasicModel.copyOf(retrieved, draft => {
          draft.body = `${retrieved.body} - edited`
        }));
  
        const retrievedUpdated = await DataStore.query(BasicModel, saved.id);
  
        assert.equal(updated.body, `${saved.body} - edited`);
        assert.equal(retrievedUpdated.body, `${saved.body} - edited`);
      });
  
      QUnit.test.skip("cannot update Post (HAS_ONE parent) SK", async assert => {
        const isolationId = makeID();
        const baseTitle = `${assert.test.testName} - ${isolationId}`;
  
        const saved = await DataStore.save(new Post({
          postId: makeID(),
          title: baseTitle
        }));
        assert.ok(saved.postId);
    
        const retrieved = await DataStore.query(Post, saved.postId);
        assert.equal(retrieved.postId, saved.postId);
        assert.equal(retrieved.title, saved.title);
  
        assert.throws(() => {
          Post.copyOf(retrieved, draft => {
            draft.title =`${baseTitle} - edited`;
          })
        }, "You should not be allowed to edit SK's");
      });
  
  
      QUnit.test.skip("cannot update Post (HAS_ONE parent) Cluster key", async assert => {
        const isolationId = makeID();
        const baseTitle = `${assert.test.testName} - ${isolationId}`;
  
        const saved = await DataStore.save(new Post({
          postId: makeID(),
          title: baseTitle
        }));
        assert.ok(saved.postId);
    
        const retrieved = await DataStore.query(Post, saved.postId);
        assert.equal(retrieved.postId, saved.postId);
        assert.equal(retrieved.title, saved.title);
  
        assert.throws(() => {
          Post.copyOf(retrieved, draft => {
            draft.id = makeID();
          })
        }, "You should not allowed to edit cluster keys");
      });
  
      QUnit.test("can update post on Comment (BELONGS_TO FK)", async assert => {
        const isolationId = makeID();
  
        const postA = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post A`
        }));
  
        const postB = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post B`
        }));
  
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`,
          post: postA
        }));
  
        const retrievedComment = await DataStore.query(Comment, comment.commentId);
  
        const updated = await DataStore.save(Comment.copyOf(retrievedComment, c => {
          c.post = postB
        }));
  
        const retrievedUpdated = await DataStore.query(Comment, comment.commentId);
  
        assert.ok(retrievedUpdated, "retrieved updated comment should exist");
        assert.equal(retrievedUpdated.post.postId, postB.postId);
      });
      
    });
  
    QUnit.module("Delete", () => {
      QUnit.test("can delete BasicModel by instance", async assert => {
        const isolationId = makeID();
        const item = await DataStore.save(new BasicModel({
          body: `${assert.test.testName} - ${isolationId}`
        }));
  
        const retrievedBeforeDelete = await DataStore.query(BasicModel, item.id);
  
        await DataStore.delete(item);
  
        const retrievedAfterDelete = await DataStore.query(BasicModel, item.id);
  
        assert.ok(retrievedBeforeDelete, "a pre-delete record should be found")
        assert.notOk(retrievedAfterDelete, "a post-delete record should NOT be found")
      });

      QUnit.test("can delete BasicModel by non-existent PK results in no error ", async assert => {
        const isolationId = makeID();
        const item = await DataStore.save(new BasicModel({
          body: `${assert.test.testName} - ${isolationId}`
        }));
  
        const retrievedBeforeDelete = await DataStore.query(BasicModel, item.id);
  
        const deleted = await DataStore.delete(BasicModel, "does not exist");
  
        const retrievedAfterDelete = await DataStore.query(BasicModel, item.id);
  
        assert.ok(retrievedBeforeDelete, "a pre-delete record should be found")
        assert.ok(retrievedAfterDelete, "a post-delete record should also be found")
        assert.deepEqual(deleted, []);
      });

      /**
       * Existing behavior. Un-skip once this produces a better error.
       */
      QUnit.test.skip("can delete BasicModel by bad PK results in meaningful error ", async assert => {
        const isolationId = makeID();
        const item = await DataStore.save(new BasicModel({
          body: `${assert.test.testName} - ${isolationId}`
        }));
  
        const retrievedBeforeDelete = await DataStore.query(BasicModel, item.id);
  
        const deleted = await DataStore.delete(BasicModel, 123);
  
        const retrievedAfterDelete = await DataStore.query(BasicModel, item.id);
  
        assert.ok(retrievedBeforeDelete, "a pre-delete record should be found")
        assert.ok(retrievedAfterDelete, "a post-delete record should also be found")
        assert.deepEqual(deleted, []);
      });
  
      QUnit.test("can delete Post by instance", async assert => {
        const isolationId = makeID();
        const post = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post`
        }))
  
        await DataStore.delete(post);
  
        const retrieved = await DataStore.query(Post, post.postId);
  
        assert.notOk(retrieved, "no record should be found")
      });
  
      QUnit.test("can delete Post by PK", async assert => {
        const isolationId = makeID();
        const post = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post`
        }))
  
        await DataStore.delete(Post, {
          postId: post.postId,
          title: post.title
        });
  
        const retrieved = await DataStore.query(Post, post.postId);
  
        assert.notOk(retrieved, "no record should be found")
      });
  
      QUnit.test("can delete Post by PK predicate", async assert => {
        const isolationId = makeID();
        const post = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post`
        }))
  
        await DataStore.delete(Post, p =>
          p.postId("eq", post.postId).title("eq", post.title)
        );
  
        const retrieved = await DataStore.query(Post, post.postId);
  
        assert.notOk(retrieved, "no record should be found")
      });
  
      QUnit.test("can delete Post by PK cluster key", async assert => {
        const isolationId = makeID();
        const post = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post`
        }));
    
        await DataStore.delete(Post, p => p.postId("eq", post.postId));
    
        const retrieved = await DataStore.query(Post, post.postId);
    
        assert.notOk(retrieved, "no record should be found")
      });
    
      QUnit.test("can delete Comment by instance", async assert => {
        const isolationId = makeID();
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`
        }));
    
        await DataStore.delete(comment);
    
        const retrieved = await DataStore.query(Comment, comment.commentId);
    
        assert.notOk(retrieved, "no record should be found")
      });
    
      QUnit.test("can delete Comment by PK cluster key", async assert => {
        const isolationId = makeID();
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`
        }));
    
        await DataStore.delete(Comment, {
          commentId: comment.commentId,
          content: comment.content
        });
    
        const retrieved = await DataStore.query(Comment, comment.commentId);
    
        assert.notOk(retrieved, "no record should be found")
      });
  
      QUnit.test("can delete Comment by PK predicate", async assert => {
        const isolationId = makeID();
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`
        }))
    
        await DataStore.delete(Comment,
          c => c.commentId('eq', comment.commentId).content('eq', comment.content)
        );
    
        const retrieved = await DataStore.query(Comment, comment.commentId);
    
        assert.notOk(retrieved, "no record should be found")
      });

      QUnit.test("can delete non-existent Comment without error", async assert => {
        const isolationId = makeID();
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`
        }))
    
        const deleted = await DataStore.delete(Comment, {
          commentId: comment.commentId,
          content: "does not exist"
        });
    
        const retrieved = await DataStore.query(Comment, comment.commentId);
    
        assert.ok(retrieved, "the original record should still exist");
        assert.deepEqual(deleted, []);
      });

      /**
       * Existing behavior. Un-skip once this produces a better error.
       */
      QUnit.test.skip("attempting to deleting Comment with partial key error is meaningful", async assert => {
        const isolationId = makeID();
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`
        }))
    
        const deleted = await DataStore.delete(Comment, {
          commentId: comment.commentId,

          // missing SK
          // content: "..."
        });
    
        const retrieved = await DataStore.query(Comment, comment.commentId);
    
        assert.ok(retrieved, "the original record should still exist");
        assert.deepEqual(deleted, []);
      });
    });
  });
  
  QUnit.module("observe", () => {
    QUnit.module("sanity checks", () => {
      QUnit.test("can observe INSERT on ALL changes to BasicModel", async assert => {
        const isolationId = makeID();
  
        const pendingUpdates = waitForObserve({model: BasicModel});
        await DataStore.save(new BasicModel({
          body: `${assert.test.testName} - ${isolationId}`
        }))
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'INSERT');
        assert.equal(updates[0].element.body, `${assert.test.testName} - ${isolationId}`);
      });
  
      QUnit.test("can observe UPDATE on ALL changes to BasicModel", async assert => {
        const isolationId = makeID();
  
        const saved = await DataStore.save(new BasicModel({
          body: `${assert.test.testName} - ${isolationId}`
        }))
  
        const pendingUpdates = waitForObserve({model: BasicModel});
        await DataStore.save(BasicModel.copyOf(saved, updated => {
          updated.body = `${assert.test.testName} - ${isolationId} - edited`
        }));
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'UPDATE');
        assert.equal(updates[0].element.body, `${assert.test.testName} - ${isolationId} - edited`);
      });
  
      QUnit.test("can observe DELETE on ALL changes to BasicModel", async assert => {
        const isolationId = makeID();
  
        const saved = await DataStore.save(new BasicModel({
          body: `${assert.test.testName} - ${isolationId}`
        }))
  
        const pendingUpdates = waitForObserve({model: BasicModel});
        await DataStore.delete(saved);
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'DELETE');
        assert.equal(updates[0].element.body, `${assert.test.testName} - ${isolationId}`);
      });

      QUnit.test("can observe changes from another client", async assert => {
        const isolationId = makeID();

        const id = makeID();
        const body = `${assert.test.testName} - ${isolationId}`;

        const pendingCreates = waitForObserve({
          model: BasicModel,
          predicate: m => m.id("eq", id)
        });

        await API.graphql({
          query: mutations.createBasicModel,
          variables: {
            input: {
              id,
              body,
              _version: 0
            }
          }
        });

        const creates = await pendingCreates;
        assert.ok(creates);
        assert.equal(creates[0].element.body, body)

        const pendingUpdates = waitForObserve({
          model: BasicModel,
          predicate: m => m.id("eq", id)
        });

        await API.graphql({
          query: mutations.updateBasicModel,
          variables: {
            input: {
              id,
              body: body + ' edited',
              _version: 1
            }
          }
        });

        const updates = await pendingUpdates;

        assert.ok(updates);
        assert.equal(updates[0].element.body, body + ' edited')

        const pendingDeletes = waitForObserve({
          model: BasicModel,
          predicate: m => m.id("eq", id)
        });

        await API.graphql({
          query: mutations.deleteBasicModel,
          variables: {
            input: {
              id,
              _version: 2
            }
          }
        });

        const deletes = await pendingDeletes;
        assert.ok(deletes);
        assert.equal(deletes[0].element.body, body + ' edited')
        
      });

    });
  
    QUnit.module("CPK models", () => {
  
      
      QUnit.test("can observe INSERT on ALL changes to Post", async assert => {

        /**
         * Due to execution order, this test fails when run alongside the rest
         * of the test suite without some padding ...
         */

        await new Promise(unsleep => setTimeout(unsleep, 2000));

        const isolationId = makeID();
  
        const pendingUpdates = waitForObserve({model: Post});
        await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId}`
        }))
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'INSERT');
        assert.equal(updates[0].element.title, `${assert.test.testName} - ${isolationId}`);
      });
  
      QUnit.test("can observe INSERT on changes to Post by predicate", async assert => {
        const isolationId = makeID();
  
        const pendingUpdates = waitForObserve({
          model: Post,
          predicate: p => p.title("eq", `${assert.test.testName} - ${isolationId}`)
        });
        await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId}`
        }))
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'INSERT');
        assert.equal(updates[0].element.title, `${assert.test.testName} - ${isolationId}`);
      });
  
      /**
       * No test for editing Post because we don't have editable fields on Post.
       */
  
       QUnit.test("can observe UPDATE on ALL changes to Comment", async assert => {
        const isolationId = makeID();
  
        const postA = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post A`
        }));
  
        const postB = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post B`
        }));
  
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`,
          post: postA
        }));
  
        const pendingUpdates = waitForObserve({model: Comment});
        const updated = await DataStore.save(Comment.copyOf(comment, draft => {
          draft.post = postB
        }));
        assert.ok(updated);
        assert.equal(updated.commentId, comment.commentId);
  
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'UPDATE');
        assert.equal(updates[0].element.content, `${assert.test.testName} - ${isolationId} - comment`);
        assert.equal(updates[0].element.post.postId, postB.postId);
      });
  
      QUnit.test("can observe UPDATE on changes to Comment by predicate", async assert => {
        const isolationId = makeID();
  
        const postA = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post A`
        }));
  
        const postB = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post B`
        }));
  
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`,
          post: postA
        }));
  
        const pendingUpdates = waitForObserve({
          model: Comment,
          predicate: c => c.content('eq', `${assert.test.testName} - ${isolationId} - comment`)
        });
        const updated = await DataStore.save(Comment.copyOf(comment, draft => {
          draft.post = postB
        }));
        assert.ok(updated);
        assert.equal(updated.commentId, comment.commentId);
  
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'UPDATE');
        assert.equal(updates[0].element.content, `${assert.test.testName} - ${isolationId} - comment`);
        assert.equal(updates[0].element.post.postId, postB.postId);
      });
  
      QUnit.test("can observe UPDATE on changes to Comment by PK predicate", async assert => {
        const isolationId = makeID();
  
        const postA = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post A`
        }));
  
        const postB = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post B`
        }));
  
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`,
          post: postA
        }));
  
        const pendingUpdates = waitForObserve({
          model: Comment,
          predicate: c => c
            .commentId('eq', comment.commentId)
            .content('eq', comment.content)
        });
        const updated = await DataStore.save(Comment.copyOf(comment, draft => {
          draft.post = postB
        }));
        assert.ok(updated);
        assert.equal(updated.commentId, comment.commentId);
  
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'UPDATE');
        assert.equal(updates[0].element.content, `${assert.test.testName} - ${isolationId} - comment`);
        assert.equal(updates[0].element.post.postId, postB.postId);
      });
  
      /**
       * Not supported. When we get a better error than "TypeError: existing is not
       * a function", let's add a check here for the better error.
       */
      QUnit.test.skip("can observe UPDATE on changes to Comment by PK object", async assert => {
        const isolationId = makeID();
  
        const postA = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post A`
        }));
  
        const postB = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post B`
        }));
  
        const comment = await DataStore.save(new Comment({
          commentId: makeID(),
          content: `${assert.test.testName} - ${isolationId} - comment`,
          post: postA
        }));
  
        const pendingUpdates = waitForObserve({
          model: Comment,
          predicate: {
            commentId: comment.commentId,
            content: comment.content
          }
        });
        const updated = await DataStore.save(Comment.copyOf(comment, draft => {
          draft.post = postB
        }));
        assert.ok(updated);
        assert.equal(updated.commentId, comment.commentId);
  
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'UPDATE');
        assert.equal(updates[0].element.content, `${assert.test.testName} - ${isolationId} - comment`);
        assert.equal(updates[0].element.post.postId, postB.postId);
      });
  
      QUnit.test("can observe DELETE on ALL changes to Post", async assert => {
        const isolationId = makeID();
  
        const saved = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId}`
        }))
  
        const pendingUpdates = waitForObserve({model: Post});
        await DataStore.delete(saved);
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'DELETE');
        assert.equal(updates[0].element.title, `${assert.test.testName} - ${isolationId}`);
      });
  
      QUnit.test("can observe DELETE on changes to Post by predicate", async assert => {
        const isolationId = makeID();
  
        const saved = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId}`
        }))
  
        const pendingUpdates = waitForObserve({
          model: Post,
          predicate: p => p.postId('eq', saved.postId)
        });
        await DataStore.delete(saved);
        const updates = await pendingUpdates;
  
        assert.equal(updates.length, 1);
        assert.equal(updates[0].opType, 'DELETE');
        assert.equal(updates[0].element.title, `${assert.test.testName} - ${isolationId}`);
      });

      QUnit.test("can observe changes from another client", async assert => {
        const isolationId = makeID();

        const postId_A = makeID();
        const title_A = `${assert.test.testName} - ${isolationId} - post A`;
        await API.graphql({
          query: mutations.createPost,
          variables: {
            input: {
              postId: postId_A,
              title: title_A,
              _version: 0
            }
          }
        })
        
        const postId_B = makeID();
        const title_B = `${assert.test.testName} - ${isolationId} - post B`;
        await API.graphql({
          query: mutations.createPost,
          variables: {
            input: {
              postId: postId_B,
              title: title_B,
              _version: 0
            }
          }
        })

        const commentId = makeID();
        const content = `${assert.test.testName} - ${isolationId}`;

        const pendingCreates = waitForObserve({
          model: Comment,
          predicate: m => m.commentId("eq", commentId)
        });

        await API.graphql({
          query: mutations.createComment,
          variables: {
            input: {
              commentId,
              content,
              postId: postId_A,
              postTitle: title_A,
              _version: 0
            }
          }
        });

        const creates = await pendingCreates;
        assert.ok(creates);
        assert.equal(creates[0].element.content, content)

        const pendingUpdates = waitForObserve({
          model: Comment,
          predicate: m => m.commentId("eq", commentId)
        });

        await API.graphql({
          query: mutations.updateComment,
          variables: {
            input: {
              commentId,
              content,
              postId: postId_B,
              postTitle: title_B,
              _version: 1
            }
          }
        });

        const updates = await pendingUpdates;

        assert.ok(updates);
        assert.equal(updates[0].element.content, content)

        const pendingDeletes = waitForObserve({
          model: Comment,
          predicate: m => m.commentId("eq", commentId)
        });

        await API.graphql({
          query: mutations.deleteComment,
          variables: {
            input: {
              commentId,
              content,
              _version: 2
            }
          }
        });

        const deletes = await pendingDeletes;
        assert.ok(deletes);
        assert.equal(deletes[0].element.content, content)
        
      });
    });
  });
  
  /**
   * skipped for the sake of time. (but, these should all work)
   */
  QUnit.module.skip("observeQuery", () => {
    QUnit.module("sanity checks", () => {
      QUnit.test("can get snapshot containing basic model", async assert => {
        const isolationId = makeID();
        const pendingSnapshots = waitForSnapshots({ model: BasicModel });
  
        const saved = await DataStore.save(new BasicModel({
          body: `${assert.test.testName} - ${isolationId}`
        }));
  
        const snapshots = await pendingSnapshots;
        assert.ok(snapshots.length >= 1);
  
        const lastSnapshot = snapshots.pop();
        assert.ok(lastSnapshot.length >= 1);
        assert.ok(lastSnapshot.some(m => m.id === saved.id));
      });
    });
  
    QUnit.module("CPK models", () => {
      QUnit.test("can get snapshot containing Post (HAS MANY parent) with ALL", async assert => {
        const isolationId = makeID();
        const pendingSnapshots = waitForSnapshots({ model: Post });
  
        const saved = await DataStore.save(new Post({
          postId: makeID(),
          title: `${assert.test.testName} - ${isolationId} - post`
        }));
  
        const snapshots = await pendingSnapshots;
        assert.ok(snapshots.length >= 1);
  
        const lastSnapshot = snapshots.pop();
        assert.ok(lastSnapshot.length >= 1);
        assert.ok(lastSnapshot.some(post => post.postId === saved.postId));
      });
  
      QUnit.test("can get snapshot containing Post (HAS MANY parent) with title predicate", async assert => {
        const isolationId = makeID();
  
        const title = `${assert.test.testName} - ${isolationId} - post`;
        const pendingSnapshots = waitForSnapshots({
          model: Post,
          predicate: p => p.title('eq', title)
        });
  
        const saved = await DataStore.save(new Post({
          postId: makeID(),
          title
        }));
  
        const snapshots = await pendingSnapshots;
        assert.ok(snapshots.length >= 1);
  
        const lastSnapshot = snapshots.pop();
        assert.ok(lastSnapshot.length >= 1);
        assert.ok(lastSnapshot.some(post => post.postId === saved.postId));
      });
  
      QUnit.test("can get snapshot containing Post (HAS MANY parent) with postId predicate", async assert => {
        const isolationId = makeID();
  
        const postId = makeID();
        const pendingSnapshots = waitForSnapshots({
          model: Post,
          predicate: p => p.postId('eq', postId)
        });
  
        const saved = await DataStore.save(new Post({
          postId,
          title: `${assert.test.testName} - ${isolationId} - post`
        }));
  
        const snapshots = await pendingSnapshots;
        assert.ok(snapshots.length >= 1);
  
        const lastSnapshot = snapshots.pop();
        assert.ok(lastSnapshot.length >= 1);
        assert.ok(lastSnapshot.some(post => post.postId === saved.postId));
      });
    })
  });
  
  QUnit.module("Related entity stuff", () => {
    QUnit.test("can create a comment on a post", async assert => {
      const post = await DataStore.save(new Post({
        postId: makeID(),
        title: assert.test.testName + " post"
      }))
  
      const comment = await DataStore.save(new Comment({
        commentId: makeID(),
        content: assert.test.testName + " comment",
        post
      }));
  
      assert.ok(comment, "return value from save() should be non-nullish");
      assert.ok(comment.commentId, "return value from save() should have an ID");
      assert.ok(comment.post, "return value from save() should have a non-nullish post");
    });
  
    QUnit.test("created comment on post can be retrieved by PK with post", async assert => {
      const post = await DataStore.save(new Post({
        postId: makeID(),
        title: assert.test.testName + " post"
      }));
    
      const comment = await DataStore.save(new Comment({
        commentId: makeID(),
        content: assert.test.testName + " comment",
        post
      }));
    
      const retrieved = await DataStore.query(Comment, comment.commentId);
    
      assert.ok(retrieved, "retrieved comment is non nullish");
      assert.equal(retrieved.commentId, comment.commentId);
      assert.equal(retrieved.content, comment.content);
      assert.equal(retrieved.post.postId, post.postId);
    });
  
    QUnit.test("can retrieve comment created on post to be retrieved by post id", async assert => {
      const post = await DataStore.save(new Post({
        postId: makeID(),
        title: assert.test.testName + " post"
      }));
    
      const comment = await DataStore.save(new Comment({
        commentId: makeID(),
        content: assert.test.testName + " comment",
        post
      }));
  
      const comments = await DataStore.query(
        Comment, comment => comment.postId("eq", post.postId)
      );
  
      assert.ok(comments);
      assert.equal(comments.length, 1);
      assert.equal(comments[0].commentId, comment.commentId);
      assert.equal(comments[0].post.postId, post.postId);
    })
  });
  
  QUnit.module("Expected error cases", () => {
    QUnit.testStart(async () => {
    });
  
    QUnit.testDone(async () => {
      // await DataStore.clear();
    });
  
    QUnit.test("cannot delete object that doesn't exist - baseline error", async assert => {
      const saved = await DataStore.save(new BasicModel({
        body: `${assert.test.testName} - basic model`
      }));
  
      const deleted = await DataStore.delete(BasicModel, makeID());
      const retrieved = await DataStore.query(BasicModel, saved.id);
  
      assert.deepEqual(deleted, []);
      assert.ok(retrieved, "the item should still be there")
    });
  
    QUnit.test("cannot save a post (HAS_MANY parent) without an ID", async assert => {
      const saveOperation = DataStore.save(new Post({
        title: assert.test.testName
      }));
  
      assert.rejects(
        saveOperation,
        /postId is required/,
        "postId should be required"
      );
    });
  
    QUnit.test("cannot create a comment without an ID", async assert => {
      const saveOperation = DataStore.save(new Comment({
        content: assert.test.testName
      }));
  
      assert.rejects(
        saveOperation,
        /commentId is required/,
        "commentId should be required"
      );
    });
  });

})();



function App() {
  return (
    <div className="App">
        <div id="qunit"></div>
        <div id="qunit-fixture"></div>
    </div>
  );
}

export default App;
