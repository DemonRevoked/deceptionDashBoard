# ssh-recorder/Dockerfile
FROM ubuntu:20.04

# 1. Install OpenSSH server
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      openssh-server \
      util-linux \
      passwd \
    && rm -rf /var/lib/apt/lists/*

# 2. Prepare SSH dirs
RUN mkdir -p /var/run/sshd && \
    mkdir -p /root/.ssh && chmod 700 /root/.ssh

# 3. Allow root login & passwords
RUN sed -i 's|^#PermitRootLogin.*|PermitRootLogin yes|' /etc/ssh/sshd_config \
 && sed -i 's|^#PasswordAuthentication.*|PasswordAuthentication yes|' /etc/ssh/sshd_config

# 4. Force PAM to accept any password by inserting pam_permit at the top
RUN sed -i '1i auth   sufficient   pam_permit.so' /etc/pam.d/sshd

# 5. (Optional) If you want to log *every* key as well, use your existing ForceCommand hook:
COPY session_recorder.sh /usr/local/bin/session_recorder.sh
RUN chmod +x /usr/local/bin/session_recorder.sh
RUN printf "\nForceCommand /usr/local/bin/session_recorder.sh\n" \
    >> /etc/ssh/sshd_config

# 6. Expose & run
EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]