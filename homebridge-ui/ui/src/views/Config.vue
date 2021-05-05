<template lang="pug">
  div
</template>

<script>
export default {
  name: 'Config',
  mounted() {
    window.homebridge.showSchemaForm();
  },
  beforeDestroy() {
    window.homebridge.hideSchemaForm();
  },
};
</script>

<style scoped></style>
