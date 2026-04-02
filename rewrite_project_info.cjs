const fs = require('fs');

const path = 'src/components/credit/tabs/ProjectInfoTab.vue';
let content = fs.readFileSync(path, 'utf8');

// The string we want to replace
const targetStart = `<template v-if="transactionData.projectData && transactionData.projectData.id">
             <div class="form-group full-width" style="margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                 <div class="section-header">
                     <h3>ข้อมูลโครงการที่เลือก: {{ transactionData.projectData.name }}</h3>
                     <button v-if="!props.readOnly" class="btn-clear" @click="clearProject" style="margin-left: auto;">ล้างข้อมูล (Clear)</button>
                 </div>`;

const newStart = `<template v-if="transactionData.projects && transactionData.projects.length > 0">
             <div v-for="(project, projectIndex) in transactionData.projects" :key="projectIndex" class="form-group full-width project-card-container" style="margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                 <div class="section-header">
                     <h3>ข้อมูลโครงการที่ {{ projectIndex + 1 }}: {{ project.projectData.name }}</h3>
                     <button v-if="!props.readOnly" class="btn-clear" @click="removeProjectCard(projectIndex)" style="margin-left: auto;">ลบโครงการ</button>
                 </div>`;

// Apply the replacement
content = content.replace(targetStart, newStart);

// Write back the file
fs.writeFileSync(path, content, 'utf8');
