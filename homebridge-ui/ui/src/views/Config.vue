<template lang="pug">
  .mt-5
    .lds-ring(v-if="loading")
      div
      div
      div
      div
    div(v-else)
</template>

<script>
export default {
  name: 'Config',
  data() {
    return {
      loading: true,
    };
  },
  async mounted() {
    const configured = await window.homebridge.getPluginConfig();

    if (!configured.length) {
      window.homebridge.updatePluginConfig([{}]);
    }

    this.loading = false;
    window.homebridge.showSchemaForm();
  },
  beforeDestroy() {
    window.homebridge.hideSchemaForm();
  },
};
</script>

<style scoped></style>
