<template lang="pug">
  main.d-flex.flex-wrap.justify-content-center.align-content-center.h-100vh.w-100
    .login.container.bg-white
      .login-inner.row
        #left-side.col-5.d-flex.flex-wrap.bg-color-primary.justify-content-center.align-content-center
          img.d-block.theme-img(src="@/assets/img/logo_white_both@pink.png", alt="camera.ui")
          .d-block.mini-text-left v{{ version }}
        #right-side.col.d-flex.flex-wrap.justify-content-center
          .row.w-100
            h3 {{ $t("welcome_message") }} 
              b.text-color-primary camera.ui
              p.mt-3.lh-1-7 {{ $t("welcome_submessage") }}
          .row.w-100
            .col-3.redline.mr-3
            .col-3.greyline
          .row.w-100.align-content-center
            loginForm(
              :loading="loading"
              @login="handleLogin"
            )
          b-link.d-block.mini-text-right(href="https://github.com/SeydX/homebridge-camera-ui", target="_blank" rel="noopener noreferrer") © SeydX
</template>

<script>
import packageFile from '../../../package.json';

import loginForm from '@/components/login-form';
import theme from '@/mixins/theme.mixin';

export default {
  name: 'Login',
  components: {
    loginForm,
  },
  mixins: [theme],
  data() {
    return {
      loading: false,
      version: packageFile.version,
    };
  },
  methods: {
    async handleLogin(user) {
      this.loading = true;
      if (user.username && user.password) {
        try {
          await this.$store.dispatch('auth/login', user);
          this.$router.push('/dashboard');
        } catch (error) {
          this.loading = false;
          console.log(error);
          this.$toast.error(this.$t('cannot_login'));
        }
      }
    },
  },
};
</script>

<style scoped>
.login {
  max-height: 600px;
  min-height: 400px;
  -webkit-box-shadow: 0px 17px 28px -21px rgba(0, 0, 0, 0.68);
  box-shadow: 0px 17px 28px -21px rgba(0, 0, 0, 0.68);
  min-width: 700px;
}

.login-inner {
  height: 100%;
}

#left-side img {
  width: 132px;
  height: 130px;
}

#right-side {
  padding: 50px 50px 50px 50px;
  background: var(--secondary-bg-color);
}

#right-side p,
#right-side span {
  color: #c4c4c4;
  font-size: 14px;
}

.mini-text-left {
  position: absolute;
  bottom: 10px;
  left: 10px;
  font-size: 10px;
  color: rgb(255, 255, 255, 0.4);
}

.mini-text-right {
  position: absolute;
  bottom: 10px;
  right: 10px;
  font-size: 10px;
  color: var(--secondary-font-color);
}

.redline {
  height: 5px;
  background: var(--primary-color);
}

.greyline {
  height: 5px;
  background: #efefef;
}

@media (max-width: 740px) {
  .login {
    min-width: unset;
    margin: 0 10px;
  }
  #left-side {
    display: none !important;
  }
  #right-side {
    border-radius: 10px;
  }
  main .container {
    padding-left: 0;
    padding-right: 0;
    width: 80%;
  }
}

@media (min-width: 768px) {
  .login {
    max-width: 700px;
  }
}

@media (min-width: 992px) {
  .login {
    max-width: 800px;
  }
  #left-side img {
    width: 162px;
    height: 160px;
  }
  #right-side {
    padding: 50px 70px 50px 70px;
  }
}

@media (min-width: 1200px) {
  /*.login {
    max-width: 1000px;
  }*/
  #right-side {
    padding: 50px 90px 50px 90px;
  }
}
</style>
