<template lang="pug">
b-link.notification(@click="$emit('showNotification')")
  span.before
  span.after
  header
    h2 {{ headerTxt }}
    span.timestamp {{ timeTxt }}
  .content
    span.sender {{ notification.camera }}
    span.message {{ message }}
    span.more {{ notification.room }}
</template>

<script>
export default {
  name: 'NotificationBanner',
  props: {
    notification: {
      type: Object,
      required: true,
    },
    headerTxt: {
      type: String,
      default: 'Notifications',
    },
    timeTxt: {
      type: String,
      default: 'Now',
    },
    triggerTxt: {
      type: String,
      default: 'Motion',
    },
  },
  data() {
    return {
      message: '',
    };
  },
  created() {
    this.message = `${this.triggerTxt} - ${this.notification.time}`;
  },
};
</script>

<style>
.Vue-Toastification__container.top-center {
  margin-top: calc(env(safe-area-inset-top, -10px) + 10px) !important;
  border-radius: 16px !important;
}

.Vue-Toastification__toast--info.notification-toast {
  background-color: var(--trans-bg-color) !important;
  backdrop-filter: blur(5px) !important;
  -webkit-backdrop-filter: blur(5px) !important;
  color: var(--primary-font-color) !important;
  border-radius: 16px !important;
  padding: 14px !important;
}

.notification,
.notification:hover {
  position: relative;
  overflow: hidden;
  color: var(--primary-font-color) !important;
  text-decoration: none !important;
}

.notification header,
.notification .more {
  opacity: 0.75;
}
.notification header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 3px;
  font-size: 12px;
}
.notification header h2 {
  text-transform: uppercase;
  font-size: 10px;
}
.notification header .timestamp {
  text-transform: lowercase;
  font-size: 10px;
}
.notification .content span {
  display: block;
  line-height: 1.4;
}
.notification .content .message {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}
.notification .content .sender,
.notification .content .event {
  font-weight: 600;
}
.notification .content .more {
  margin-top: 4px;
  font-size: 10px;
}
.notification .before,
.notification .after {
  left: calc(50% - 50vw);
}
</style>
