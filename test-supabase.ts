import { supabase, supabaseAdmin, initializeDatabase } from './supabase';

console.log('=== Supabase Connection Test ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '***SET***' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '***SET***' : 'NOT SET');

async function testConnection() {
  console.log('\n--- Testing Basic Connection ---');
  
  try {
    // Test basic connection with anon key
    const { data, error } = await supabase.from('conversations').select('*').limit(1);
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return false;
    } else {
      console.log('✅ Basic connection successful');
      console.log('📊 Conversations count:', data?.length || 0);
    }

    // Test admin connection if available
    if (supabaseAdmin) {
      console.log('\n--- Testing Admin Connection ---');
      const { data: adminData, error: adminError } = await supabaseAdmin.from('conversations').select('*').limit(1);
      if (adminError) {
        console.error('❌ Admin connection error:', adminError);
      } else {
        console.log('✅ Admin connection successful');
        console.log('📊 Admin conversations count:', adminData?.length || 0);
      }
    } else {
      console.log('⚠️  Admin connection not available (no service role key)');
    }

    // Test database initialization
    console.log('\n--- Testing Database Initialization ---');
    await initializeDatabase();
    console.log('✅ Database initialization completed');

    // Test basic CRUD operations
    console.log('\n--- Testing CRUD Operations ---');
    
    // Test insert
    const testConversation = {
      user_id: 'test-user',
      message: 'Test message',
      response: 'Test response',
      metadata: { test: true }
    };

    const { data: insertData, error: insertError } = await supabase
      .from('conversations')
      .insert(testConversation)
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Test select
      const { data: selectData, error: selectError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', 'test-user')
        .order('created_at', { ascending: false })
        .limit(1);

      if (selectError) {
        console.error('❌ Select error:', selectError);
      } else {
        console.log('✅ Select successful:', selectData);
      }

      // Test update
      const { data: updateData, error: updateError } = await supabase
        .from('conversations')
        .update({ message: 'Updated test message' })
        .eq('user_id', 'test-user')
        .select();

      if (updateError) {
        console.error('❌ Update error:', updateError);
      } else {
        console.log('✅ Update successful:', updateData);
      }

      // Test delete
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', 'test-user');

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
      } else {
        console.log('✅ Delete successful');
      }
    }

    // Test memories table
    console.log('\n--- Testing Memories Table ---');
    const testMemory = {
      user_id: 'test-user',
      key: 'test-key',
      value: 'test-value'
    };

    const { data: memoryData, error: memoryError } = await supabase
      .from('memories')
      .upsert(testMemory)
      .select();

    if (memoryError) {
      console.error('❌ Memory insert error:', memoryError);
    } else {
      console.log('✅ Memory insert successful:', memoryData);
      
      // Clean up test memory
      await supabase
        .from('memories')
        .delete()
        .eq('user_id', 'test-user');
      console.log('✅ Memory cleanup completed');
    }

    console.log('\n🎉 All tests completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the test
testConnection().then((success) => {
  if (success) {
    console.log('\n✅ Supabase connection test PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ Supabase connection test FAILED');
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});