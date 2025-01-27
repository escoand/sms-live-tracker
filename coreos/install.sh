#!/bin/sh

set -eu

DEV=${1?}
MACHINE=${2:-}
TMP=$(mktemp -d)
MNT=$(mktemp -d)

# clean up
# shellcheck disable=SC2064
trap "sudo -n umount '$MNT'; rm -rf '$TMP' '$MNT'" EXIT

if [ "$MACHINE" = rpi ]; then
    ARCH=aarch64
else
    ARCH=$(uname -m)
fi

# ignition
podman run --rm -i -v .:/data:ro quay.io/coreos/butane:release \
    --pretty --strict --files-dir /data <coreos/config.bu >coreos/config.ign

# install coreos
sudo podman run --rm --privileged -i -v /dev:/dev -v /run/udev:/run/udev -v .:/data:ro -v /etc/NetworkManager/system-connections:/nm:ro \
    quay.io/coreos/coreos-installer:release \
    install -a "$ARCH" -i /data/coreos/config.ign -n --network-dir /nm "$DEV"

# get firmware
if [ "$ARCH" = aarch64 ]; then
    podman run --rm -i -v "$TMP":/data:z fedora:40 \
        dnf install --downloadonly -y --forcearch=aarch64 --destdir=/data uboot-images-armv8 bcm283x-firmware bcm283x-overlays
    for RPM in "$TMP"/*.rpm; do
        rpm2cpio "$RPM" | cpio -id -D "$TMP"
    done
    mv "$TMP/usr/share/uboot/rpi_arm64/u-boot.bin" "$TMP/boot/efi/rpi-u-boot.bin"

    # install firmware
    lsblk "$DEV" -oLABEL,PATH |
        awk '$1=="EFI-SYSTEM" { print $2 }' |
        sudo xargs -i mount {} "$MNT"
    sudo rsync -rl --ignore-existing "$TMP/boot/efi/" "$MNT"
fi
