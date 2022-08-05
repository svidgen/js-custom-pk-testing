import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * 
 *            NONE OF THIS WORKS
 * 
 * It seems like we get a completely non-browsery execution context for this
 * which Amplify is not equipped to handle.
 * 
 */

// import Amplify, { DataStore } from 'aws-amplify';
// import awsconfig from './aws-exports';
// import { BasicModel, Post, Comment } from './models';

// Amplify.configure(awsconfig);

// test('renders learn react link', () => {
//   render(<App />);
//   const linkElement = screen.getByText(/learn react/i);
//   expect(linkElement).toBeInTheDocument();
// });



// test("can create a basic model", async () => {
//   const sanityCheck = await DataStore.save(new BasicModel({
//     title: "just a regular old title"
//   }))
// });




// test.skip('create a Post (HAS_MANY parent) without ID fails to autogenerate ID', async () => {
//   const post = await DataStore.save(new Post({
//     title: "create a Post (HAS_MANY parent) without ID fails to autogenerate ID"
//   }));

//   /**
//    * Highly unexpected error:
//    * 
//    *     Native crypto module could not be used to get secure random number.

//       at cryptoSecureRandomInt (node_modules/amazon-cognito-identity-js/lib/utils/cryptoSecureRandomInt.web.js:38:9)
//       at WordArray.random (node_modules/amazon-cognito-identity-js/lib/utils/WordArray.js:50:56)
//       at randomBytes (node_modules/@aws-amplify/datastore/src/util.ts:657:37)
//       at prng (node_modules/@aws-amplify/datastore/src/util.ts:659:20)
//       at randomChar (node_modules/ulid/dist/index.umd.js:49:27)
//       at encodeRandom (node_modules/ulid/dist/index.umd.js:80:15)
//       at ulid (node_modules/ulid/dist/index.umd.js:158:38)
//       at node_modules/@aws-amplify/datastore/src/util.ts:664:10
//       at recipe (node_modules/@aws-amplify/datastore/src/datastore/datastore.ts:478:10)
//       at Object.Immer.produce (node_modules/@aws-amplify/datastore/node_modules/immer/src/core/immerClass.ts:94:14)
//       at new Setting (node_modules/@aws-amplify/datastore/src/datastore/datastore.ts:453:21)
//       at modelInstanceCreator (node_modules/@aws-amplify/datastore/src/datastore/datastore.ts:294:9)
//       at node_modules/@aws-amplify/datastore/src/datastore/datastore.ts:710:5
//       at step (node_modules/@aws-amplify/datastore/lib/datastore/datastore.js:44:23)
//       at Object.next (node_modules/@aws-amplify/datastore/lib/datastore/datastore.js:25:53)
//       at fulfilled (node_modules/@aws-amplify/datastore/lib/datastore/datastore.js:16:58)
//    * 
//    * 
//    */
// });

// test.skip("can create a Post (HAS_MANY parent) with ID", async () => {
//   const post = await DataStore.save(new Post({
//     postId: UUID(),
//     title: "can create a Post (HAS_MANY parent) with ID"
//   }))

//   expect(post).not.toBeNull();
//   expect(post).not.toBeUndefined();
//   expect(post.title).toBe("can create a Post (HAS_MANY parent) with ID");
// })