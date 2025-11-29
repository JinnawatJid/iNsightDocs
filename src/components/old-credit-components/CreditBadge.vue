<template>
  <div class="credit-badge" :style="{ backgroundColor: badgeColor }">
    {{ status }}
  </div>
</template>

<script>
export default {
  name: 'CreditBadge',
  props: {
    status: {
      type: String,
      required: true,
    },
  },
  computed: {
    badgeColor() {
      const positiveStatus = ['สามารถขอเครดิตได้', 'สามารถขอเครดิตเพิ่มได้'];
      if (positiveStatus.includes(this.status)) {
        return '#25A249'; // Green for positive
      } else {
        return '#FF383C'; // Red for negative
      }
    },
  },
};
</script>

<style scoped>
.credit-badge {
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  color: white;
  font-weight: 500;
  font-size: 12px;
  text-align: center;
  display: inline-block;
}
</style>
