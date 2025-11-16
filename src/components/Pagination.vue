<template>
  <div class="pagination">
    <button v-if="!isFirstPage" class="arrow" @click="prevPage">Previous</button>
    <div v-for="page in pages" :key="page">
      <button v-if="page !== '...'" :class="{ 'page-number': true, active: page === currentPage }" @click="changePage(page)">{{ page }}</button>
      <span v-else class="ellipsis">...</span>
    </div>
    <button v-if="!isLastPage" class="arrow" @click="nextPage">Next</button>
  </div>
</template>

<script>
export default {
  name: 'Pagination',
  props: {
    currentPage: {
      type: Number,
      required: true,
    },
    totalPages: {
      type: Number,
      required: true,
    },
  },
  emits: ['page-changed'],
  computed: {
    isFirstPage() {
      return this.currentPage === 1;
    },
    isLastPage() {
      return this.currentPage === this.totalPages;
    },
    pages() {
      const range = [];
      for (let i = 1; i <= this.totalPages; i++) {
        if (i === 1 || i === this.totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
          range.push(i);
        }
      }

      const pagesWithEllipsis = [];
      let lastPage = 0;
      for (const page of range) {
        if (lastPage) {
          if (page - lastPage === 2) {
            pagesWithEllipsis.push(lastPage + 1);
          } else if (page - lastPage !== 1) {
            pagesWithEllipsis.push('...');
          }
        }
        pagesWithEllipsis.push(page);
        lastPage = page;
      }

      return pagesWithEllipsis;
    },
  },
  methods: {
    changePage(page) {
      if (page !== '...') {
        this.$emit('page-changed', page);
      }
    },
    prevPage() {
      if (!this.isFirstPage) {
        this.$emit('page-changed', this.currentPage - 1);
      }
    },
    nextPage() {
      if (!this.isLastPage) {
        this.$emit('page-changed', this.currentPage + 1);
      }
    },
  },
};
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
}

.arrow {
  background-color: transparent;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 1rem;
  margin: 0 0.5rem;
}

.page-number {
  background-color: transparent;
  border: none;
  border-radius: 4px;
  color: #007bff;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem 0.75rem;
  margin: 0 0.25rem;
}

.page-number.active {
  background-color: #007bff;
  color: white;
}

.ellipsis {
  margin: 0 0.5rem;
  color: #888;
}
</style>
