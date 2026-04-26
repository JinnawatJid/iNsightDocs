import { ref, computed } from 'vue';

const dbCategories = ['System', 'Workflow', 'API', 'Business', 'UserRoles'];

const allCategories = new Set(dbCategories);
allCategories.add('Scorecards');
allCategories.add('WorkflowMgmt');
console.log(Array.from(allCategories).sort());
