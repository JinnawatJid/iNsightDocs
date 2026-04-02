with open('src/components/credit/tabs/ProjectInfoTab.vue', 'r') as f:
    content = f.read()

# remove extra </template> blocks that were incorrectly kept.
content = content.replace("""      />
    </div>
  </div>
</template>
      </div>
    </div>
  </div>
</template>""", """      />
    </div>
  </div>
</template>""")

with open('src/components/credit/tabs/ProjectInfoTab.vue', 'w') as f:
    f.write(content)
