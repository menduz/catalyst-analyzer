.PHONY: shamonth

MONTH = "202106"

shamonth:
	find ./content/deployments/*-$(MONTH) -type f -print0  | xargs -0 shasum | sort