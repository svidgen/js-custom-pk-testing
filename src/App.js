import { useEffect } from 'react';
import QUnit from 'qunit';
import awsconfig from './aws-exports';
import 'qunit/qunit/qunit.css';

import { Amplify, DataStore } from 'aws-amplify';
import { BasicModel, Post, Comment } from './models';

Amplify.configure(awsconfig);

const makeID = () => crypto.randomUUID();

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
    })

    QUnit.test("can delete Post by instance", async assert => {
      const isolationId = makeID();
      const post = await DataStore.save(new Post({
        postId: makeID(),
        title: `${assert.test.testName} - ${isolationId} - post`
      }))

      await DataStore.delete(post);

      const retrieved = await DataStore.query(Post, post.postId);

      assert.notOk(retrieved, "no record should be found")
    })

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
      }))
  
      await DataStore.delete(Post, p => p.postId("eq", post.postId));
  
      const retrieved = await DataStore.query(Post, post.postId);
  
      assert.notOk(retrieved, "no record should be found")
    });
  
    QUnit.test("can delete Comment by instance", async assert => {
      const isolationId = makeID();
      const comment = await DataStore.save(new Comment({
        commentId: makeID(),
        body: `${assert.test.testName} - ${isolationId} - comment`
      }))
  
      await DataStore.delete(comment);
  
      const retrieved = await DataStore.query(Comment, comment.commentId);
  
      assert.notOk(retrieved, "no record should be found")
    });
  
    QUnit.test("can delete Comment by instance", async assert => {
      const isolationId = makeID();
      const comment = await DataStore.save(new Comment({
        commentId: makeID(),
        body: `${assert.test.testName} - ${isolationId} - comment`
      }))
  
      await DataStore.delete(Comment, {
        commentId: comment.commentId,
        body: comment.body
      });
  
      const retrieved = await DataStore.query(Comment, comment.commentId);
  
      assert.notOk(retrieved, "no record should be found")
    });
  });
});

// QUnit.module("observe", () => {
//   QUnit.test("sanity check - can observe changes to BasicModel", async assert => {
//     s
//   });
// });

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

function App() {
  return (
    <div className="App">
        <div id="qunit"></div>
        <div id="qunit-fixture"></div>
    </div>
  );
}

export default App;
