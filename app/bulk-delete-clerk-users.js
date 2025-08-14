//! DONT TOUCH THIS FILE
const { clerkClient } = require('@clerk/clerk-sdk-node');

async function deleteAllUsers() {
  try {
    console.log('Fetching all users...');
    
    // Get all users (paginated)
    let allUsers = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      const response = await clerkClient.users.getUserList({
        limit,
        offset,
      });
      
      allUsers = allUsers.concat(response);
      hasMore = response.length === limit;
      offset += limit;
      
      console.log(`Fetched ${allUsers.length} users so far...`);
    }

    console.log(`Found ${allUsers.length} total users to delete`);

    if (allUsers.length === 0) {
      console.log('No users found to delete.');
      return;
    }

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will delete ALL users permanently!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete users one by one (with some parallel processing for speed)
    const deletePromises = [];
    const batchSize = 10; // Process 10 users at a time to avoid rate limits

    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (user) => {
        try {
          await clerkClient.users.deleteUser(user.id);
          console.log(`✓ Deleted user: ${user.emailAddresses?.[0]?.emailAddress || user.id}`);
          return { success: true, userId: user.id };
        } catch (error) {
          console.error(`✗ Failed to delete user ${user.id}:`, error.message);
          return { success: false, userId: user.id, error: error.message };
        }
      });

      // Wait for current batch to complete before starting next batch
      const batchResults = await Promise.all(batchPromises);
      deletePromises.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + batchSize < allUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Summary
    const successful = deletePromises.filter(result => result.success).length;
    const failed = deletePromises.filter(result => !result.success).length;

    console.log('\n=== DELETION SUMMARY ===');
    console.log(`✓ Successfully deleted: ${successful} users`);
    console.log(`✗ Failed to delete: ${failed} users`);
    
    if (failed > 0) {
      console.log('\nFailed deletions:');
      deletePromises
        .filter(result => !result.success)
        .forEach(result => {
          console.log(`- ${result.userId}: ${result.error}`);
        });
    }

  } catch (error) {
    console.error('Error during bulk deletion:', error);
  }
}

// Set up your Clerk secret key as an environment variable
if (!process.env.CLERK_SECRET_KEY) {
  console.error('Please set CLERK_SECRET_KEY environment variable');
  process.exit(1);
}

deleteAllUsers();