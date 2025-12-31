<template>
  <div class="comment-history" v-if="comments && comments.length > 0">
    <h4>ประวัติความคิดเห็น</h4>
    <div class="timeline">
      <div v-for="comment in comments" :key="comment.id" class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="comment-header">
            <span class="role">{{ comment.actor_role }}</span>
            <span class="date">{{ formatDate(comment.created_at) }}</span>
          </div>
          <div class="comment-body">
            {{ comment.comment_text }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CommentHistory',
  props: {
    comments: {
      type: Array,
      default: () => []
    }
  },
  setup() {
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return {
      formatDate
    };
  }
};
</script>

<style scoped>
.comment-history {
  margin-bottom: 20px;
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #eee;
}

.comment-history h4 {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}

.timeline {
  position: relative;
  padding-left: 20px;
  border-left: 2px solid #e0e0e0;
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
}

.timeline-marker {
  position: absolute;
  left: -26px; /* Adjust to center on line */
  top: 5px;
  width: 10px;
  height: 10px;
  background-color: #0056FF;
  border-radius: 50%;
  border: 2px solid white;
}

.timeline-content {
  background: white;
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 13px;
}

.role {
  font-weight: bold;
  color: #0056FF;
}

.date {
  color: #888;
}

.comment-body {
  font-size: 14px;
  color: #333;
  white-space: pre-wrap; /* Preserve newlines */
}
</style>
