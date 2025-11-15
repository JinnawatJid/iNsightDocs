<template>
  <div class="relative inline-block text-left">
    <div>
      <button @click="toggleDropdown" type="button" class="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500" id="options-menu" aria-haspopup="true" aria-expanded="true">
        + เพิ่มคำขอเครดิตใหม่
      </button>
    </div>

    <div v-if="isOpen" class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
      <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
        <a href="#" @click.prevent="selectOption('new')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">คำขอเครดิตใหม่</a>
        <a href="#" @click.prevent="selectOption('additional')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">คำขอเครดิตเพิ่มเติม</a>
        <a href="#" @click.prevent="selectOption('project')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">คำขอเครดิตโครงการ</a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isOpen: false,
    };
  },
  methods: {
    toggleDropdown() {
      this.isOpen = !this.isOpen;
    },
    selectOption(option) {
      this.isOpen = false;
      if (option === 'new') {
        this.$router.push('/new-credit-application');
      }
      // Handle other options later
    },
  },
};
</script>
