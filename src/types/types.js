'use strict';

const inherits = require('util').inherits;

module.exports = {
  registerWith: function (hap) {
    const Characteristic = hap.Characteristic;
    
    /// /////////////////////////////////////////////////////////////////////////
    // Snapshot Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.Snapshot = function() {
      Characteristic.call(this, 'Take Snapshot', 'E8AEE54F-6E4B-46D8-85B2-FECE188FDB08');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.WRITE]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Snapshot, Characteristic);
    Characteristic.Snapshot.UUID = 'E8AEE54F-6E4B-46D8-85B2-FECE188FDB08';
    
    /// /////////////////////////////////////////////////////////////////////////
    // Assets Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.Assets = function() {
      Characteristic.call(this, 'Assets', 'ACD9DFE7-948D-43D0-A205-D2F6F368541D');
      this.setProps({
        format: Characteristic.Formats.TLV8,
        perms: [Characteristic.Perms.EVENTS]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Assets, Characteristic);
    Characteristic.Assets.UUID = 'ACD9DFE7-948D-43D0-A205-D2F6F368541D';
    
    /// /////////////////////////////////////////////////////////////////////////
    // GetAssets Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.GetAssets = function() {
      Characteristic.call(this, 'Get Assets', '6A6C39F5-67F0-4BE1-BA9D-E56BD27C9606');
      this.setProps({
        format: Characteristic.Formats.TLV8,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.GetAssets, Characteristic);
    Characteristic.GetAssets.UUID = '6A6C39F5-67F0-4BE1-BA9D-E56BD27C9606';
    
    /// /////////////////////////////////////////////////////////////////////////
    // DeleteAssets Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.DeleteAssets = function() {
      Characteristic.call(this, 'Delete Assets', '3982EB69-1ECE-463E-96C6-E5A7DF2FA1CD');
      this.setProps({
        format: Characteristic.Formats.TLV8,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.DeleteAssets, Characteristic);
    Characteristic.DeleteAssets.UUID = '3982EB69-1ECE-463E-96C6-E5A7DF2FA1CD';
    
    /// /////////////////////////////////////////////////////////////////////////
    // AtHome Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.AtHome = function() {
      Characteristic.call(this, 'At Home', '67a36c3e-5488-4223-8c47-89d3bb7a9d5f');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.AtHome, Characteristic);
    Characteristic.AtHome.UUID = '67a36c3e-5488-4223-8c47-89d3bb7a9d5f';
    
    /// /////////////////////////////////////////////////////////////////////////
    // Telegram Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.Telegram = function() {
      Characteristic.call(this, 'Telegram', 'ac063f66-ee68-4426-8f20-af3b7fbebef2');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Telegram, Characteristic);
    Characteristic.Telegram.UUID = 'ac063f66-ee68-4426-8f20-af3b7fbebef2';

    /// /////////////////////////////////////////////////////////////////////////
    // DisableCloud Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.DisableCloud = function() {
      Characteristic.call(this, 'Disable Cloud', '1fd20f2b-195c-4408-a4f6-eb5755946fd1');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.DisableCloud, Characteristic);
    Characteristic.DisableCloud.UUID = '1fd20f2b-195c-4408-a4f6-eb5755946fd1';
    
    /// /////////////////////////////////////////////////////////////////////////
    // RecWoCloud Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.RecWoCloud = function() {
      Characteristic.call(this, 'Rec without Cloud', 'f388b7e1-e1d7-46e1-94c4-8246da31cc7e');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.RecWoCloud, Characteristic);
    Characteristic.RecWoCloud.UUID = 'f388b7e1-e1d7-46e1-94c4-8246da31cc7e';
    
    /// /////////////////////////////////////////////////////////////////////////
    // Proxychains Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.Proxychains = function() {
      Characteristic.call(this, 'Proxychains', '09c41beb-003f-4775-8118-8e3b538353e8');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Proxychains, Characteristic);
    Characteristic.Proxychains.UUID = '09c41beb-003f-4775-8118-8e3b538353e8';

    /// /////////////////////////////////////////////////////////////////////////
    // SSH Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.SSH = function() {
      Characteristic.call(this, 'SSH', 'ec11100b-f1f9-42cd-98f4-687edad5d0ab');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.SSH, Characteristic);
    Characteristic.SSH.UUID = 'ec11100b-f1f9-42cd-98f4-687edad5d0ab';

    /// /////////////////////////////////////////////////////////////////////////
    // FTP Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.FTP = function() {
      Characteristic.call(this, 'FTP', '4db66368-3895-47bd-a4f0-fd865e5feba4');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.FTP, Characteristic);
    Characteristic.FTP.UUID = '4db66368-3895-47bd-a4f0-fd865e5feba4';

    /// /////////////////////////////////////////////////////////////////////////
    // Telnet Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.Telnet = function() {
      Characteristic.call(this, 'Telnet', '8f792fec-afc6-4518-9e46-25b0f043ed85');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Telnet, Characteristic);
    Characteristic.Telnet.UUID = '8f792fec-afc6-4518-9e46-25b0f043ed85';

    /// /////////////////////////////////////////////////////////////////////////
    // NTPD Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.NTPD = function() {
      Characteristic.call(this, 'NTPD', '1aeaf89f-0f10-4787-8c5c-90df54c75501');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.NTPD, Characteristic);
    Characteristic.NTPD.UUID = '1aeaf89f-0f10-4787-8c5c-90df54c75501';

    /// /////////////////////////////////////////////////////////////////////////
    // Reboot Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.Reboot = function() {
      Characteristic.call(this, 'Reboot', '1b9c771c-6ec3-4b12-944f-e67f689ec87c');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Reboot, Characteristic);
    Characteristic.Reboot.UUID = '1b9c771c-6ec3-4b12-944f-e67f689ec87c';

  }
};