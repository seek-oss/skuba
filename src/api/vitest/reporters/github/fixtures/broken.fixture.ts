// Throwing at the top level fails the module during collection, before any
// test can run.
throw new Error('Failed to collect');
