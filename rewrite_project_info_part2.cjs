const fs = require('fs');

const path = 'src/components/credit/tabs/ProjectInfoTab.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/transactionData\.projectData/g, "project.projectData");
content = content.replace(/transactionData\.adjusted/g, "project.adjusted");
content = content.replace(/transactionData\.contractorType/g, "project.contractorType");
content = content.replace(/transactionData\.customerTeam/g, "project.customerTeam");
content = content.replace(/transactionData\.mainContractorName/g, "project.mainContractorName");
content = content.replace(/transactionData\.mainContractorVat/g, "project.mainContractorVat");

content = content.replace(
    /getFile\('contractor_company_profile_doc'\)/g,
    "getFile(`contractor_company_profile_doc_${projectIndex}`)"
);
content = content.replace(
    /updateFile\('contractor_company_profile_doc', val\)/g,
    "updateFile(`contractor_company_profile_doc_${projectIndex}`, val)"
);

content = content.replace(
    /getFile\('contractor_balance_sheet_doc'\)/g,
    "getFile(`contractor_balance_sheet_doc_${projectIndex}`)"
);
content = content.replace(
    /updateFile\('contractor_balance_sheet_doc', val\)/g,
    "updateFile(`contractor_balance_sheet_doc_${projectIndex}`, val)"
);

content = content.replace(
    /getFile\('contractor_profit_loss_doc'\)/g,
    "getFile(`contractor_profit_loss_doc_${projectIndex}`)"
);
content = content.replace(
    /updateFile\('contractor_profit_loss_doc', val\)/g,
    "updateFile(`contractor_profit_loss_doc_${projectIndex}`, val)"
);

content = content.replace(
    /getFile\('contractor_financial_ratios_doc'\)/g,
    "getFile(`contractor_financial_ratios_doc_${projectIndex}`)"
);
content = content.replace(
    /updateFile\('contractor_financial_ratios_doc', val\)/g,
    "updateFile(`contractor_financial_ratios_doc_${projectIndex}`, val)"
);

content = content.replace(/@click="addProduct"/g, `@click="addProduct(projectIndex)"`);
content = content.replace(/@click="removeProduct\(idx\)"/g, `@click="removeProduct(projectIndex, idx)"`);
content = content.replace(/@blur="formatAdjustedValue"/g, `@blur="formatAdjustedValue(projectIndex)"`);
content = content.replace(/@input="handleAdjustedValueInput"/g, `@input="handleAdjustedValueInput($event, projectIndex)"`);
content = content.replace(/@input="handleProductPriceInput\(\$event, idx\)"/g, `@input="handleProductPriceInput($event, projectIndex, idx)"`);
content = content.replace(/@blur="formatProductPrice\(idx\)"/g, `@blur="formatProductPrice(projectIndex, idx)"`);


content = content.replace(
    /getFile\('project_contract_doc'\)/g,
    "getFile(`project_contract_doc_${projectIndex}`)"
);
content = content.replace(
    /updateFile\('project_contract_doc', val\)/g,
    "updateFile(`project_contract_doc_${projectIndex}`, val)"
);

content = content.replace(
    /getFile\('quotation_doc'\)/g,
    "getFile(`quotation_doc_${projectIndex}`)"
);
content = content.replace(
    /updateFile\('quotation_doc', val\)/g,
    "updateFile(`quotation_doc_${projectIndex}`, val)"
);

content = content.replace(
    /getFile\('project_security_doc'\)/g,
    "getFile(`project_security_doc_${projectIndex}`)"
);
content = content.replace(
    /updateFile\('project_security_doc', val\)/g,
    "updateFile(`project_security_doc_${projectIndex}`, val)"
);

content = content.replace(
    /getFile\('project_cash_deposit_doc'\)/g,
    "getFile(`project_cash_deposit_doc_${projectIndex}`)"
);
content = content.replace(
    /updateFile\('project_cash_deposit_doc', val\)/g,
    "updateFile(`project_cash_deposit_doc_${projectIndex}`, val)"
);


content = content.replace(
    /getGuaranteeDetail\('projectBankGuaranteeDetails'/g,
    "getGuaranteeDetail(projectIndex, 'projectBankGuaranteeDetails'"
);
content = content.replace(
    /handleGuaranteeAmountInput\('projectBankGuaranteeDetails'/g,
    "handleGuaranteeAmountInput(projectIndex, 'projectBankGuaranteeDetails'"
);
content = content.replace(
    /updateGuaranteeDetail\('projectBankGuaranteeDetails'/g,
    "updateGuaranteeDetail(projectIndex, 'projectBankGuaranteeDetails'"
);

content = content.replace(
    /getGuaranteeDetail\('projectCashDepositDetails'/g,
    "getGuaranteeDetail(projectIndex, 'projectCashDepositDetails'"
);
content = content.replace(
    /handleGuaranteeAmountInput\('projectCashDepositDetails'/g,
    "handleGuaranteeAmountInput(projectIndex, 'projectCashDepositDetails'"
);
content = content.replace(
    /updateGuaranteeDetail\('projectCashDepositDetails'/g,
    "updateGuaranteeDetail(projectIndex, 'projectCashDepositDetails'"
);

// End tags
content = content.replace(
`                </div>
             </div>
        </template>`,
`                </div>
             </div>
             </div>
        </template>`);

// Footer logic
content = content.replace(
`<OtherDocumentsSection
                  v-if="project.projectData && project.projectData.id"`,
`<OtherDocumentsSection
                  v-if="transactionData.projects && transactionData.projects.length > 0"`);


fs.writeFileSync(path, content, 'utf8');
