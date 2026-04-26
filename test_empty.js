const configurations = {
  System: [],
  Workflow: [
    { config_key: "WORKFLOW_CONFIG", data_type: "json" }
  ]
}

const activeCategory = 'Workflow';
const r = configurations[activeCategory].filter(c => c.data_type !== 'json');
console.log(r);
