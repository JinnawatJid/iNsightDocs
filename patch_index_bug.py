import re

with open('src/components/credit/tabs/ProjectInfoTab.vue', 'r') as f:
    content = f.read()

# Replace occurrences of + projectIndex with + project.projectId for file keys.
content = content.replace("'contractor_company_profile_doc_' + projectIndex", "'contractor_company_profile_doc_' + project.projectId")
content = content.replace("'contractor_balance_sheet_doc_' + projectIndex", "'contractor_balance_sheet_doc_' + project.projectId")
content = content.replace("'contractor_profit_loss_doc_' + projectIndex", "'contractor_profit_loss_doc_' + project.projectId")
content = content.replace("'contractor_financial_ratios_doc_' + projectIndex", "'contractor_financial_ratios_doc_' + project.projectId")

content = content.replace("'project_contract_doc_' + projectIndex", "'project_contract_doc_' + project.projectId")
content = content.replace("'quotation_doc_' + projectIndex", "'quotation_doc_' + project.projectId")
content = content.replace("'project_security_doc_' + projectIndex", "'project_security_doc_' + project.projectId")
content = content.replace("'project_cash_deposit_doc_' + projectIndex", "'project_cash_deposit_doc_' + project.projectId")

# Update removeProjectCard to delete files using projectId instead of projectIndex
remove_card_content = """const removeProjectCard = (projectIndex) => {
    const projectId = store.transactionData.projects[projectIndex].projectId;
    store.transactionData.projects.splice(projectIndex, 1);

    // Also cleanup files associated with this project ID
    store.updateFile('project_contract_doc_' + projectId, null);
    store.updateFile('quotation_doc_' + projectId, null);
    store.updateFile('project_security_doc_' + projectId, null);
    store.updateFile('project_cash_deposit_doc_' + projectId, null);
    store.updateFile('contractor_company_profile_doc_' + projectId, null);
    store.updateFile('contractor_balance_sheet_doc_' + projectId, null);
    store.updateFile('contractor_profit_loss_doc_' + projectId, null);
    store.updateFile('contractor_financial_ratios_doc_' + projectId, null);
};"""

content = re.sub(r'const removeProjectCard = \(projectIndex\) => \{.*?\};', remove_card_content, content, flags=re.DOTALL)

with open('src/components/credit/tabs/ProjectInfoTab.vue', 'w') as f:
    f.write(content)
